require('colors')

const http = require('http')
const https = require('https')
const express = require('express')
const cluster = require('cluster')
const path = require('path')
const os = require('os')
const fs = require('fs')
const fsr = require('./lib/tools/fsr')()

module.exports = function (params) {
  params = params || {} // ensure params are an object

  // appDir is either specified by the user or sourced from the parent require
  params.appDir = params.appDir || path.dirname(module.parent.filename)

  let app = express() // initialize express
  let appName
  let appEnv
  let httpsParams
  let httpServer
  let httpsServer
  let httpsOptions
  let reloadHttpsOptions = {}
  let authInfoPath
  let numCPUs = 1
  let servers = []
  let i
  let connections = {}
  let initialized = false
  let faviconPath
  let flags
  let clusterKilled = 0
  let checkConnectionsTimeout
  let shutdownType

  let httpReloadPromise
  let httpsReloadPromise

  // expose initial vars
  app.set('express', express)
  app.set('params', params)

  // source user supplied params
  app = require('./lib/sourceParams')(app)

  // Store updated params back into local variable
  params = app.get('params')

  // get and expose logger
  const Logger = require('roosevelt-logger')
  const logger = new Logger(params.logging)
  app.set('logger', logger)

  // warn the user if there are any dependencies that are missing or out of date for the user, or to make a package.json file if they don't have one
  if (app.get('params').checkDependencies) {
    let output = require('check-dependencies').sync({ packageDir: app.get('appDir') })
    if (!output.depsWereOk) {
      let mainError = output.error[output.error.length - 1]
      if (mainError.includes('npm install')) {
        logger.warn('📦', 'Currently installed npm dependencies do not match the versions that are specified in package.json! You may need to run npm i or npm ci')
      }
    }
  }

  appName = app.get('appName')
  appEnv = app.get('env')
  flags = app.get('flags')

  logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)
  httpsParams = app.get('params').https

  // let's try setting up the servers with user-supplied params
  if (!httpsParams.force) {
    httpServer = http.Server(app)
    httpServer.on('connection', mapConnections)

    if (params.frontendReload.enable && appEnv === 'development') {
      httpReloadPromise = require('reload')(app, { route: '/reloadHttp', port: params.frontendReload.port, verbose: params.frontendReload.verbose, webSocketServerWaitStart: true })
    }
  }

  if (httpsParams.enable) {
    authInfoPath = httpsParams.authInfoPath

    // options to configure to the https server
    httpsOptions = {}

    if (authInfoPath) {
      if (authInfoPath.p12 && authInfoPath.p12.p12Path) {
        // if the string ends with a dot and 3 alphanumeric characters (including _)
        // then we assume it's a filepath.
        if (typeof authInfoPath.p12.p12Path === 'string' && authInfoPath.p12.p12Path.match(/\.\w{3}$/)) {
          httpsOptions.pfx = fs.readFileSync(authInfoPath.p12.p12Path)
        } else { // if the string doesn't end that way, we assume it's an encrypted string
          httpsOptions.pfx = authInfoPath.p12.p12Path
        }

        reloadHttpsOptions.p12 = {}
        reloadHttpsOptions.p12.p12Path = httpsOptions.pfx

        if (authInfoPath.p12.passphrase) {
          httpsOptions.passphrase = authInfoPath.p12.passphrase
          reloadHttpsOptions.p12.passphrase = httpsOptions.passphrase
        }
      } else if (authInfoPath.authCertAndKey) {
        reloadHttpsOptions.certAndKey = {}

        if (authInfoPath.authCertAndKey.cert) {
          if (isCertString(authInfoPath.authCertAndKey.cert)) {
            httpsOptions.cert = authInfoPath.authCertAndKey.cert
          } else {
            httpsOptions.cert = fs.readFileSync(authInfoPath.authCertAndKey.cert)
          }

          reloadHttpsOptions.certAndKey.cert = httpsOptions.cert
        }
        if (authInfoPath.authCertAndKey.key) {
          // key strings are formatted the same way as cert strings
          if (isCertString(authInfoPath.authCertAndKey.key)) {
            httpsOptions.key = authInfoPath.authCertAndKey.key
          } else {
            httpsOptions.key = fs.readFileSync(authInfoPath.authCertAndKey.key)
          }

          reloadHttpsOptions.certAndKey.key = httpsOptions.key
        }
      }
    }
    if (httpsParams.caCert) {
      if (typeof httpsParams.caCert === 'string') {
        if (isCertString(httpsParams.caCert)) { // then it's the cert(s) as a string, not a file path
          httpsOptions.ca = httpsParams.caCert
        } else { // it's a file path to the file, so read file
          httpsOptions.ca = fs.readFileSync(httpsParams.caCert)
        }
      } else if (httpsParams.caCert instanceof Array) {
        httpsOptions.ca = []

        httpsParams.caCert.forEach(function (certOrPath) {
          let certStr = certOrPath
          if (!isCertString(certOrPath)) {
            certStr = fs.readFileSync(certOrPath)
          }
          httpsOptions.ca.push(certStr)
        })
      }
    }

    if (params.frontendReload.enable && appEnv === 'development') {
      httpsReloadPromise = require('reload')(app, { route: '/reloadHttps', port: params.frontendReload.httpsPort || params.frontendReload.port, verbose: params.frontendReload.verbose, forceWss: true, https: reloadHttpsOptions, webSocketServerWaitStart: true })
    }

    httpsOptions.requestCert = httpsParams.requestCert
    httpsOptions.rejectUnauthorized = httpsParams.rejectUnauthorized

    httpsServer = https.Server(httpsOptions, app)
    httpsServer.on('connection', mapConnections)
  }

  app.httpServer = httpServer
  app.httpsServer = httpsServer

  // enable gzip compression
  app.use(require('compression')())

  // enable cookie parsing
  app.use(require('cookie-parser')())

  // enable favicon support
  if (app.get('params').favicon !== 'none' && app.get('params').favicon !== null) {
    faviconPath = path.join(app.get('appDir'), app.get('params').staticsRoot, app.get('params').favicon)
    if (fsr.fileExists(faviconPath)) {
      app.use(require('serve-favicon')(faviconPath))
    } else {
      logger.warn(`Favicon ${app.get('params').favicon} does not exist. Please ensure the "favicon" param is configured correctly.`)
    }
  }

  // bind user-defined middleware which fires at the beginning of each request if supplied
  if (params.onReqStart && typeof params.onReqStart === 'function') {
    app.use(params.onReqStart)
  }

  // configure express
  app = require('./lib/setExpressConfigs')(app)

  // fire user-defined onServerInit event
  if (params.onServerInit && typeof params.onServerInit === 'function') {
    params.onServerInit(app)
  }

  // assign individual keys to connections when opened so they can be destroyed gracefully
  function mapConnections (conn) {
    let key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn

    // once the connection closes, remove
    conn.on('close', function () {
      delete connections[key]
      if (app.get('roosevelt:state') === 'disconnecting') {
        connectionCheck()
      }
    })
  }

  // Initialize Roosevelt app middleware and prepare static css,js
  function initServer (cb) {
    if (initialized) {
      return cb()
    }
    initialized = true

    // Inject reload javascript HTML tag
    require('./lib/injectReload')(app)

    // Minify HTML
    require('./lib/htmlMinifier')(app)

    preprocessCss()

    function preprocessCss () {
      require('./lib/preprocessCss')(app, bundleJs)
    }

    function bundleJs () {
      require('./lib/jsBundler')(app, compileJs)
    }

    function compileJs () {
      require('./lib/jsCompiler')(app, validateHTML)
    }

    function validateHTML () {
      if (app.get('env') === 'development') {
        require('./lib/htmlValidator')(app, scanBuiltFiles)
      } else {
        scanBuiltFiles()
      }
    }

    function scanBuiltFiles () {
      require('./lib/tools/buildScanner')(app, mapRoutes)
    }

    function mapRoutes () {
      // map routes
      app = require('./lib/mapRoutes')(app)

      // custom error page
      app = require('./lib/500ErrorPage.js')(app)

      if (cb && typeof cb === 'function') {
        cb()
      }
    }
  }

  // shut down all servers, connections and threads that the roosevelt app is using
  function gracefulShutdown (close) {
    let key
    let keys
    shutdownType = close

    // force destroy connections if the server takes too long to shut down
    checkConnectionsTimeout = setTimeout(() => {
      logger.error(`${appName} could not close all connections in time; forcefully shutting down`)
      for (key in connections) {
        connections[key].destroy()
      }
      if (shutdownType === 'close') {
        if (httpServer) {
          httpServer.close()
        }
        if (httpsServer) {
          httpsServer.close()
        }
      } else {
        process.exit()
      }
    }, app.get('params').shutdownTimeout)

    app.set('roosevelt:state', 'disconnecting')
    logger.info('\n💭 ', `${appName} received kill signal, attempting to shut down gracefully.`.magenta)

    if (cluster.isMaster) {
      keys = Object.keys(cluster.workers)
    }

    if (keys !== undefined && keys.length > 1) {
      for (let x = 0; x < keys.length; x++) {
        cluster.workers[keys[x]].kill('SIGINT')
      }
    } else {
      // if the app is in development mode, kill all connections instantly and exit
      if (appEnv === 'development') {
        for (key in connections) {
          connections[key].destroy()
        }
        exitLog()
      } else {
        // else do the normal procedure of seeing if there are still connections before closing
        connectionCheck()
      }
    }
  }

  function exitLog () {
    clearTimeout(checkConnectionsTimeout)
    logger.info('✅', `${appName} successfully closed all connections and shut down gracefully.`.green)
    if (shutdownType === 'close') {
      if (httpServer) {
        httpServer.close()
      }
      if (httpsServer) {
        httpsServer.close()
      }
    } else {
      process.exit()
    }
  }

  function connectionCheck () {
    let connectionsAmount = Object.keys(connections)
    if (connectionsAmount.length === 0) {
      exitLog()
    }
  }

  // start server
  function startHttpServer () {
    // determine number of CPUs to use
    const max = os.cpus().length
    let cores = flags.cores

    if (cores) {
      if (cores === 'max') {
        numCPUs = max
      } else if (cores <= max && cores > 0) {
        numCPUs = cores
      } else {
        logger.warn(`Invalid value "${cores}" supplied to --cores command line argument. Defaulting to 1 core.`)
      }
    }

    // shut down the process if both the htmlValidator and the app are trying to use the same port
    if (app.get('params').port === app.get('params').htmlValidator.port) {
      logger.error(`${appName} and the HTML validator are both trying to use the same port. You'll need to change the port setting on one of them to proceed.`)
      process.exit(1)
    }

    function serverPush (server, serverPort, serverFormat) {
      servers.push(server.listen(serverPort, (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(` ${serverFormat}`, serverPort)).on('error', (err) => {
        if (err.message.includes('EADDRINUSE')) {
          logger.error(`Another process is using port ${serverPort}. Either kill that process or change this app's port number.`)
        }
        logger.error(err)
        process.exit(1)
      }))
    }

    let lock = {}
    let startupCallback = function (proto, port) {
      return function () {
        logger.info('🎧', `${appName} ${proto.trim()} server listening on port ${port} (${appEnv} mode)`.bold)
        if (!Object.isFrozen(lock)) {
          Object.freeze(lock)
          // fire user-defined onServerStart event
          if (params.onServerStart && typeof params.onServerStart === 'function') {
            params.onServerStart(app)
          }
        }
      }
    }

    if (cluster.isMaster && numCPUs > 1) {
      for (i = 0; i < numCPUs; i++) {
        cluster.fork()
      }
      cluster.on('exit', function (worker, code, signal) {
        logger.info('⚰️', `${appName} thread ${worker.process.pid} died`.magenta)
        clusterKilled++
        if (clusterKilled === parseInt(numCPUs)) {
          exitLog()
        }
      })

      // make it so that the master process will go to gracefulShutdown when it is killed
      process.on('SIGTERM', gracefulShutdown)
      process.on('SIGINT', gracefulShutdown)
    } else {
      if (!app.get('params').https.force) {
        serverPush(httpServer, app.get('params').port, 'HTTP')
        if (httpReloadPromise) {
          httpReloadPromise.then(httpReload => {
            httpReload.startWebSocketServer().then(() => {
              logger.log('🎧', `Reload HTTP server is listening on port: ${params.frontendReload.port}`.bold)
            })
          }).catch(function (err) {
            logger.error(('Reload was unable to initialize - ' + err.toString()).red)
          })
        }
      }
      if (httpsParams.enable) {
        serverPush(httpsServer, httpsParams.port, 'HTTPS')
        if (httpsReloadPromise) {
          httpsReloadPromise.then(httpsReload => {
            httpsReload.startWebSocketServer().then(() => {
              logger.log('🎧', `Reload HTTPS server is listening on port: ${params.frontendReload.httpsPort || params.frontendReload.port}`.bold)
            }).catch(function (err) {
              logger.error((`Reload was unable to start - ${err.toString()}`).red)
            })
          }).catch(function (err) {
            logger.error(('Reload was unable to initialize - ' + err.toString()).red)
          })
        }
      }

      process.on('SIGTERM', gracefulShutdown)
      process.on('SIGINT', gracefulShutdown)
    }
  }

  function startServer () {
    if (!initialized) {
      return initServer(startHttpServer)
    }
    startHttpServer()
  }

  function isCertString (stringToTest) {
    let testString = stringToTest
    if (typeof testString !== 'string') {
      testString = testString.toString()
    }
    let lastChar = testString.substring(testString.length - 1)
    // A file path string won't have an end of line character at the end
    // Looking for either \n or \r allows for nearly any OS someone could
    // use, and a few that node doesn't work on.
    if (lastChar === '\n' || lastChar === '\r') {
      return true
    }
    return false
  }

  return {
    httpServer: httpServer,
    httpsServer: httpsServer,
    expressApp: app,
    initServer: initServer,
    startServer: startServer,
    stopServer: gracefulShutdown
  }
}
