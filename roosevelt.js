require('@colors/colors')

const http = require('http')
const https = require('https')
const express = require('express')
const cluster = require('cluster')
const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const fsr = require('./lib/tools/fsr')()
const getCerts = require('./lib/scripts/certsGenerator')

module.exports = (params, schema) => {
  params = params || {} // ensure params are an object

  // appDir is either specified by the user or sourced from the parent require
  params.appDir = params.appDir || path.dirname(module.parent.filename)

  const reloadHttpsOptions = {}
  const servers = []
  const connections = {}
  let app = express() // initialize express
  const router = express.Router() // initialize router
  let httpServer
  let httpsServer
  let httpsOptions
  let authInfoPath
  let numCPUs = 1
  let i
  let initialized = false
  let faviconPath
  let clusterKilled = 0
  let checkConnectionsTimeout
  let shutdownType
  let httpReloadPromise
  let httpsReloadPromise

  // expose initial vars
  app.set('express', express)
  app.set('router', router)

  // source user supplied params
  params = require('./lib/sourceParams')(params, app, schema)

  // use existence of public folder to determine first run
  if (!fsr.fileExists(params.publicFolder) && params.logging.methods.info) {
    // run the param audit
    require('./lib/scripts/configAuditor').audit(params.appDir)
    require('./lib/scripts/deprecationCheck')(params.appDir)
  }

  const logger = app.get('logger')
  const appName = app.get('appName')
  const appEnv = app.get('env')

  if (params.makeBuildArtifacts === 'staticsOnly') {
    logger.info('💭', `Building ${appName} static site...`.bold)
  } else {
    logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)
  }

  const httpsParams = params.https

  // let's try setting up the servers with user-supplied params
  if (!httpsParams.force || !httpsParams.enable) {
    httpServer = http.Server(app)
    httpServer.on('connection', mapConnections)
  }

  // configure reload HTTP server
  if (appEnv === 'development' && params.frontendReload.enable) {
    httpReloadPromise = configReloadServer('HTTP')
  }

  if (httpsParams.enable) {
    authInfoPath = httpsParams.authInfoPath

    // options to configure to the https server
    httpsOptions = {}
    if (!fsr.fileExists('./lib/scripts/certsGenerator')) {
      getCerts.certsGenerator()
    }

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

      // set passphrase if in use
      if (httpsParams.passphrase) {
        httpsOptions.passphrase = httpsParams.passphrase
        reloadHttpsOptions.passphrase = httpsParams.passphrase
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

    // configure reload HTTPS server
    if (appEnv === 'development' && params.frontendReload.enable) {
      httpsReloadPromise = configReloadServer('HTTPS')
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
  if (params.favicon !== 'none' && params.favicon !== null) {
    faviconPath = path.join(params.staticsRoot, params.favicon)
    if (fsr.fileExists(faviconPath)) {
      app.use(require('serve-favicon')(faviconPath))
    } else {
      logger.warn(`Favicon ${params.favicon} does not exist. Please ensure the "favicon" param is configured correctly.`)
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
    const key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn

    // once the connection closes, remove
    conn.on('close', function () {
      delete connections[key]
      if (app.get('roosevelt:state') === 'disconnecting') {
        connectionCheck()
      }
    })
  }

  function initServer (cb) {
    if (initialized) {
      return cb()
    }
    initialized = true

    require('./lib/generateSymlinks')(app)

    require('./lib/injectReload')(app) // inject's reload's <script> tag

    require('./lib/htmlMinifier')(app)

    preprocessStaticPages()

    function preprocessStaticPages () {
      require('./lib/preprocessStaticPages')(app, preprocessCss)
    }

    function preprocessCss () {
      require('./lib/preprocessCss')(app, bundleJs)
    }

    function bundleJs () {
      require('./lib/jsBundler')(app, validateHTML)
    }

    function validateHTML () {
      if (app.get('env') === 'development' && params.htmlValidator.enable) {
        // instantiate the validator if it's installed
        try {
          require('express-html-validator')(app, params.htmlValidator)
        } catch { }
      }
      mapRoutes()
    }

    function mapRoutes () {
      // map routes
      app = require('./lib/mapRoutes')(app)

      // parse routes
      app.set('routes', parseRoutes(app))

      // custom error page
      app = require('./lib/500ErrorPage.js')(app)

      if (cb && typeof cb === 'function') {
        cb()
      }
    }

    require('./lib/isomorphicControllersFinder')(app)

    require('./lib/viewsBundler')(app)
  }

  // Parse routes of app and router level routes
  function parseRoutes (app, basePath, endpoints) {
    const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
    const stack = app.stack || (app._router && app._router.stack)

    endpoints = endpoints || []
    basePath = basePath || ''

    stack.forEach(function (stackItem) {
      if (stackItem.route) {
        for (const method in stackItem.route.methods) {
          if (method === 'get' && !stackItem.route.path.match(/(\/:[a-z]+)|(\.)|(\*)/)) {
            endpoints.push(basePath + (basePath && stackItem.route.path === '/' ? '' : stackItem.route.path))
          }
        }
      } else if (stackItem.name === 'router' || stackItem.name === 'bound dispatch') {
        if (regexpExpressRegexp.test(stackItem.regexp)) {
          const parsedPath = regexpExpressRegexp.exec(stackItem.regexp)[1].replace(/\\\//g, '/')
          parseRoutes(stackItem.handle, basePath + '/' + parsedPath, endpoints)
        } else {
          parseRoutes(stackItem.handle, basePath, endpoints)
        }
      }
    })

    return endpoints
  }

  // shut down all servers, connections and threads that the roosevelt app is using
  function gracefulShutdown (close) {
    let key
    let keys
    shutdownType = close

    // fire user-defined onAppExit event
    if (params.onAppExit && typeof params.onAppExit === 'function') {
      params.onAppExit(app)
    }

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
    }, params.shutdownTimeout)

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
    const connectionsAmount = Object.keys(connections)
    if (connectionsAmount.length === 0) {
      exitLog()
    }
  }

  // start server
  async function startHttpServer () {
    // determine number of CPUs to use
    const max = os.cpus().length
    const cores = params.cores

    if (cores) {
      if (cores === 'max') {
        numCPUs = max
      } else if (cores <= max && cores > 0) {
        numCPUs = cores
      } else {
        logger.warn(`Invalid value "${cores}" supplied to --cores command line argument. Defaulting to 1 core.`)
      }
    }

    function serverPush (server, serverPort, serverFormat) {
      servers.push(server.listen(serverPort, (params.localhostOnly ? 'localhost' : null), startupCallback(serverFormat, serverPort)).on('error', (err) => {
        logger.error(err)
        if (err.message.includes('EADDRINUSE')) {
          logger.error(`Another process is using port ${serverPort}. Either kill that process or change this app's port number.`.bold)
        }
        process.exit(1)
      }))
    }

    const lock = {}
    function startupCallback (proto, port) {
      return async function () {
        function finalMessages () {
          logger.info('🎧', `${appName} ${proto} server listening on port ${port} (${appEnv} mode) ➡️  ${proto.toLowerCase()}://localhost:${port}`.bold)
          if (params.localhostOnly) {
            logger.warn(`${appName} will only respond to requests coming from localhost. If you wish to override this behavior and have it respond to requests coming from outside of localhost, then set "localhostOnly" to false. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt`)
          }
          if (!params.hostPublic) {
            logger.warn('Hosting of public folder is disabled. Your CSS, JS, images, and other files served via your public folder will not load unless you serve them via another web server. If you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set "hostPublic" to true. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt')
          }
        }

        // spin up reload http(s) service if enabled in dev mode
        if (appEnv === 'development' && params.frontendReload.enable === true) {
          try {
            let reloadServer
            const config = params.frontendReload

            // get reload ready and bind instance to express variable
            if (proto === 'HTTP') {
              reloadServer = await httpReloadPromise
              app.set('reloadHttpServer', reloadServer)
            } else {
              reloadServer = await httpsReloadPromise
              app.set('reloadHttpsServer', reloadServer)
            }

            // spin up the reload server
            await reloadServer.startWebSocketServer()
            logger.log('🎧', `${appName} frontend reload ${proto} server is listening on port ${proto === 'HTTP' ? config.port : config.httpsPort}`)
            finalMessages()
          } catch (e) {
            logger.error(e)
          }
        } else {
          finalMessages()
        }

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
      if (!httpsParams.force || !httpsParams.enable) {
        serverPush(httpServer, params.port, 'HTTP')
      }
      if (httpsParams.enable) {
        serverPush(httpsServer, httpsParams.port, 'HTTPS')
      }

      process.on('SIGTERM', gracefulShutdown)
      process.on('SIGINT', gracefulShutdown)
    }
  }
  /**
   * Start reload http(s) service
   * @param {String} proto - Which protocol to start
   * @returns {object} - Reload server instance
   */
  function configReloadServer (proto) {
    const reload = require('reload')
    const config = {
      verbose: !!params.logging.methods.verbose,
      webSocketServerWaitStart: true
    }

    if (proto === 'HTTP') {
      config.route = '/reloadHttp'
      config.port = params.frontendReload.port
    } else {
      config.route = '/reloadHttps'
      config.port = params.frontendReload.httpsPort
      config.forceWss = false // lets this work in self-signed cert situations
      config.https = reloadHttpsOptions
    }

    const reloadInstance = reload(app, config)
    return reloadInstance
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
    const lastChar = testString.substring(testString.length - 1)
    // A file path string won't have an end of line character at the end
    // Looking for either \n or \r allows for nearly any OS someone could
    // use, and a few that node doesn't work on.
    if (lastChar === '\n' || lastChar === '\r') {
      return true
    }
    return false
  }

  return {
    httpServer,
    httpsServer,
    expressApp: app,
    initServer,
    init: initServer,
    startServer,
    stopServer: gracefulShutdown
  }
}
