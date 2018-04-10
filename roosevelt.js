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
  let logger
  let appName
  let appEnv
  let httpServer
  let httpsServer
  let httpsOptions
  let keyPath
  let ca
  let cafile
  let passphrase
  let numCPUs = 1
  let servers = []
  let i
  let connections = {}
  let initialized = false
  let faviconPath
  let flags
  let clusterKilled = 0

  // expose initial vars
  app.set('express', express)
  app.set('params', params)

  // source user supplied params
  app = require('./lib/sourceParams')(app)
  logger = require('./lib/tools/logger')(app)

  appName = app.get('appName')
  appEnv = app.get('env')
  flags = app.get('flags')

  logger.log('💭', `Starting ${appName} in ${appEnv} mode...`.bold)

  // let's try setting up the servers with user-supplied params
  if (!app.get('params').https.httpsOnly) {
    httpServer = http.Server(app)
    httpServer.on('connection', mapConnections)
  }

  if (app.get('params').https.enable) {
    httpsOptions = {
      requestCert: app.get('params').https.requestCert,
      rejectUnauthorized: app.get('params').https.rejectUnauthorized
    }
    ca = app.get('params').https.ca
    cafile = app.get('params').https.cafile !== false
    passphrase = app.get('params').https.passphrase
    keyPath = app.get('params').https.keyPath

    if (keyPath) {
      if (app.get('params').https.pfx) {
        httpsOptions.pfx = fs.readFileSync(keyPath.pfx)
      } else {
        httpsOptions.key = fs.readFileSync(keyPath.key)
        httpsOptions.cert = fs.readFileSync(keyPath.cert)
      }
      if (passphrase) {
        httpsOptions.passphrase = passphrase
      }
      if (ca) {
        // Are we using a CA file, or are we sending the CA directly?
        if (cafile) {
          // String or array
          if (typeof ca === 'string') {
            httpsOptions.ca = fs.readFileSync(ca)
          } else if (ca instanceof Array) {
            httpsOptions.ca = []
            ca.forEach(function (val, index, array) {
              httpsOptions.ca.push(fs.readFileSync(val))
            })
          }
        } else {
          httpsOptions.ca = ca
        }
      }
    }
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
      logger.warn(`Favicon ${app.get('params').favicon} does not exist. Please ensure the "favicon" param is configured correctly.`.yellow)
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
    })
  }

  // Initialize Roosevelt app middleware and prepare static css,js
  function initServer (cb) {
    if (initialized) {
      return cb()
    }
    initialized = true

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
      require('./lib/htmlValidator')(app, mapRoutes)
    }

    require('./lib/htmlMinify')(app)

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
        logger.warn(`Invalid value "${cores}" supplied to --cores command line argument. Defaulting to 1 core.`.yellow)
      }
    }

    // shut down the process if both the htmlValidator and the app are trying to use the same port
    if (app.get('params').port === app.get('params').htmlValidator.port) {
      logger.error('Both the roosevelt app and the validator are trying to access the same port. Please adjust one of the ports param to go to a different port'.red)
      process.exit(1)
    }
    function exitLog () {
      logger.log('✔️', `${appName} successfully closed all connections and shut down gracefully.`.magenta)
      process.exit()
    }

    function gracefulShutdown () {
      let key

      app.set('roosevelt:state', 'disconnecting')
      logger.log('\n💭 ', `${appName} received kill signal, attempting to shut down gracefully.`.magenta)

      let keys = Object.keys(cluster.workers)
      if (keys.length > 1 && keys !== undefined) {
        for (let x = 0; x < keys.length; x++) {
          cluster.workers[keys[x]].kill('SIGINT')
        }
      } else {
        servers[0].close(function () {
          if (servers.length > 1) {
            servers[1].close(exitLog)
          } else {
            exitLog()
          }
        })
      }

      // destroy connections when server is killed
      for (key in connections) {
        connections[key].destroy()
      }
    }

    function serverPush (server, serverPort, serverFormat) {
      servers.push(server.listen(serverPort, (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(` ${serverFormat}`, serverPort)).on('error', (err) => {
        if (err) {
          if (err.message.includes('ECONNRESET')) {
            logger.error('The connection was forcibly closed by a peer, this could be caused by a something in the code that is telling the server to end early, usually a timeout or reboot')
          } else if (err.message.includes('EPERM')) {
            logger.error('You do not have the permission to perform making a server on the computer. If you are testing, try running the terminal as the admin')
          } else if (err.message.includes('EADDRNOTAVAIL')) {
            logger.error('The address/port you are trying to access is not avaliable, try assigning your server and/or validator to another port')
          }
          process.exit()
        }
      }))
    }

    let lock = {}
    let startupCallback = function (proto, port) {
      return function () {
        logger.log('🎧', `${appName} ${proto.trim()} server listening on port ${port} (${appEnv} mode)`.bold)
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
        logger.log('⚰️', `${appName} thread ${worker.process.pid} died`.magenta)
        clusterKilled++
        if (clusterKilled === parseInt(numCPUs)) {
          exitLog()
        }
      })

      // make it so that the master process will go to gracefulShutdown when it is killed
      process.on('SIGTERM', gracefulShutdown)
      process.on('SIGINT', gracefulShutdown)
    } else {
      if (!app.get('params').https.httpsOnly) {
        serverPush(httpServer, app.get('port'), 'HTTP')
      }
      if (app.get('params').https.enable) {
        serverPush(httpsServer, app.get('params').https.httpsPort, 'HTTPS')
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

  return {
    httpServer: httpServer,
    httpsServer: httpsServer,
    expressApp: app,
    initServer: initServer,
    startServer: startServer
  }
}
