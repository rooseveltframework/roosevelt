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
  const sourceName = path.basename(module.parent.filename) // name of file that required roosevelt
  const flags = require('./lib/sourceFlags')(sourceName) // parse cli args
  params = params || {} // ensure params are an object

  // appDir is either specified by the user or sourced from the parent require
  params.appDir = params.appDir || path.dirname(module.parent.filename)

  // check for command line overrides for NODE_ENV
  if (flags.productionMode) {
    process.env.NODE_ENV = 'production'
  } else if (flags.developmentMode) {
    process.env.NODE_ENV = 'development'
  } else {
    // default to production mode
    process.env.NODE_ENV = 'production'
  }

  let app = express() // initialize express
  let logger
  let appName
  let appEnv
  let httpServer
  let httpsServer
  let httpsOptions
  let ca
  let cafile
  let passphrase
  let numCPUs = 1
  let servers = []
  let i
  let connections = {}
  let initialized = false
  let faviconPath

  // expose initial vars
  app.set('express', express)
  app.set('params', params)
  app.set('flags', flags)

  // source user supplied params
  app = require('./lib/sourceParams')(app)
  logger = require('./lib/tools/logger')(app)

  appName = app.get('appName')
  appEnv = app.get('env')

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
    passphrase = app.get('params').passphrase

    if (app.get('params').https.keyPath) {
      if (app.get('params').https.pfx) {
        httpsOptions.pfx = fs.readFileSync(app.get('params').https.keyPath.pfx)
      } else {
        httpsOptions.key = fs.readFileSync(app.get('params').https.keyPath.key)
        httpsOptions.cert = fs.readFileSync(app.get('params').https.keyPath.cert)
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

      cb()
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

    function gracefulShutdown () {
      let key
      function exitLog () {
        logger.log('✔️', `${appName} successfully closed all connections and shut down gracefully.`.magenta)
        process.exit()
      }

      app.set('roosevelt:state', 'disconnecting')
      logger.log('\n💭 ', `${appName} received kill signal, attempting to shut down gracefully.`.magenta)
      servers[0].close(function () {
        if (servers.length > 1) {
          servers[1].close(exitLog)
        } else {
          exitLog()
        }
      })

      // destroy connections when server is killed
      for (key in connections) {
        connections[key].destroy()
      }

      setTimeout(function () {
        logger.error(`${appName} could not close all connections in time; forcefully shutting down.`.red)
        process.exit(1)
      }, app.get('params').shutdownTimeout)
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
      })
    } else {
      if (!app.get('params').httpsOnly) {
        servers.push(httpServer.listen(app.get('port'), (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(' HTTP', app.get('port'))))
      }
      if (app.get('params').https) {
        servers.push(httpsServer.listen(app.get('params').httpsPort, (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(' HTTPS', app.get('params').httpsPort)))
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
