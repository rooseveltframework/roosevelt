require('@colors/colors')
const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const fsr = require('./lib/tools/fsr')()
const certsGenerator = require('./lib/scripts/certsGenerator.js')
const sessionSecretGenerator = require('./lib/scripts/sessionSecretGenerator.js')
const csrfSecretGenerator = require('./lib/scripts/csrfSecretGenerator.js')

module.exports = (params = {}, schema) => {
  params.appDir = params.appDir || path.dirname(module.parent.filename) // appDir is either specified by the user or sourced from the parent require
  const connections = {}
  let app = express() // initialize express
  const router = express.Router() // initialize router
  let httpServer
  let httpsServer
  let initialized = false
  let checkConnectionsTimeout
  let persistProcess
  let initDone = false

  // expose initial vars
  app.set('express', express)
  app.set('router', router)

  // source user-supplied params
  params = require('./lib/sourceParams')(params, app, schema)
  const logger = app.get('logger')
  const appName = app.get('appName')
  const appEnv = app.get('env')

  // use existence of public folder to determine if this is the first run
  if (!fsr.fileExists(params.publicFolder) && params.logging.methods.info) {
    // run the param audit
    require('./lib/scripts/configAuditor').audit(params.appDir)
    require('./lib/scripts/deprecationCheck')(params.appDir)
  }

  // app starting message
  if (params.makeBuildArtifacts === 'staticsOnly') logger.info('💭', `Building ${appName} static site in ${appEnv} mode...`.bold)
  else logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)

  // generate express session secret
  if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly') {
    if (!fs.existsSync(params.secretsDir) || !fs.existsSync(params.secretsDir + '/sessionSecret.json')) {
      sessionSecretGenerator()
    }
  }

  // generate csrf secret
  if (params.csrfProtection && params.makeBuildArtifacts !== 'staticsOnly') {
    if (!fs.existsSync(params.secretsDir) || !fs.existsSync(params.secretsDir + '/csrfSecret.json')) {
      csrfSecretGenerator()
    }
  }

  // set up http server
  if (!params.https.force || !params.https.enable) {
    httpServer = require('http').Server(app)
    httpServer.on('connection', mapConnections)
  }

  // setup https server if https is enabled
  if (params.https.enable && params.makeBuildArtifacts !== 'staticsOnly') {
    const authInfoPath = params.https.authInfoPath
    const httpsOptions = {}

    // runs the certGenerator if params.https.enable
    if (params.https.autoCert && authInfoPath?.authCertAndKey) {
      const { authCertAndKey } = authInfoPath

      if ((!fs.existsSync(params.secretsDir) || (!fs.existsSync(authCertAndKey.key) || (!fs.existsSync(authCertAndKey.cert))))) {
        certsGenerator()
      }
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

    if (authInfoPath) {
      if (authInfoPath.p12?.p12Path) {
        // if the string ends with a dot and 3 alphanumeric characters (including _)
        // then we assume it's a filepath.
        if (typeof authInfoPath.p12.p12Path === 'string' && authInfoPath.p12.p12Path.match(/\.\w{3}$/)) {
          httpsOptions.pfx = fs.readFileSync(path.join(params.appDir, params.secretsDir, authInfoPath.p12.p12Path))
        } else { // if the string doesn't end that way, we assume it's an encrypted string
          httpsOptions.pfx = authInfoPath.p12.p12Path
        }
      } else if (authInfoPath.authCertAndKey) {
        function assignCertStringByKey (key) {
          const { authCertAndKey } = authInfoPath
          const certString = authCertAndKey[key]

          if (isCertString(certString)) httpsOptions[key] = certString
          else httpsOptions[key] = fs.readFileSync(path.join(params.appDir, params.secretsDir, certString))
        }

        if (authInfoPath.authCertAndKey.cert) assignCertStringByKey('cert')
        if (authInfoPath.authCertAndKey.key) assignCertStringByKey('key')
      }

      // set passphrase if in use
      if (params.https.passphrase) httpsOptions.passphrase = params.https.passphrase
    }

    if (params.https.caCert) {
      if (typeof params.https.caCert === 'string') {
        if (isCertString(params.https.caCert)) { // then it's the cert(s) as a string, not a file path
          httpsOptions.ca = params.https.caCert
        } else { // it's a file path to the file, so read file
          httpsOptions.ca = fs.readFileSync(path.join(params.appDir, params.secretsDir, params.https.caCert))
        }
      } else if (params.https.caCert instanceof Array) {
        httpsOptions.ca = []

        for (const certOrPath of params.https.caCert) {
          let certStr = certOrPath
          if (!isCertString(certOrPath)) certStr = fs.readFileSync(certOrPath)
          httpsOptions.ca.push(certStr)
        }
      }
    }

    httpsOptions.requestCert = params.https.requestCert
    httpsOptions.rejectUnauthorized = params.https.rejectUnauthorized

    httpsServer = require('https').Server(httpsOptions, app)
    httpsServer.on('connection', mapConnections)
  }

  // expose http server(s) to the user via express var
  app.set('httpServer', httpServer)
  app.set('httpsServer', httpsServer)

  // enable gzip compression
  app.use(require('compression')())

  // enable favicon support
  if (params.favicon !== 'none' && params.favicon !== null) {
    const faviconPath = path.join(params.staticsRoot, params.favicon)
    if (fsr.fileExists(faviconPath)) app.use(require('serve-favicon')(faviconPath))
    else logger.warn(`Favicon ${params.favicon} does not exist. Please ensure the "favicon" param is configured correctly.`)
  }

  // bind user-defined middleware which fires at the beginning of each request if supplied
  if (params.onReqStart && typeof params.onReqStart === 'function') {
    app.use(params.onReqStart)
  }

  // configure express, express-session, and csrf
  app = require('./lib/setExpressConfigs')(app)

  // fire user-defined onServerInit event
  if (params.onServerInit && typeof params.onServerInit === 'function') {
    params.onServerInit(app)
  }

  // utility functions

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

      // custom error page
      app = require('./lib/500ErrorPage.js')(app)

      if (params.onStaticAssetsGenerated && typeof params.onStaticAssetsGenerated === 'function') {
        params.onStaticAssetsGenerated(app)
      }

      initDone = true
      if (cb && typeof cb === 'function') {
        cb()
      }
    }

    require('./lib/isomorphicControllersFinder')(app)

    require('./lib/viewsBundler')(app)
  }

  function startReloadServer (proto, server) {
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
      config.https = {
        p12: server.pfx,
        certAndKey: {
          cert: server.cert,
          key: server.key
        },
        passphrase: server.passphrase
      }
    }

    return reload(router, config)
  }

  function startServer () {
    if (!initialized) {
      return initServer(startHttpServer)
    }
    startHttpServer()
  }

  async function startHttpServer () {
    const interval = setInterval(() => {
      if (!initDone) return

      function attemptServerStart (server, serverPort, serverFormat) {
        if (params.makeBuildArtifacts !== 'staticsOnly') {
          server.listen(serverPort, (params.localhostOnly ? 'localhost' : null), startupCallback(serverFormat, serverPort)).on('error', (err) => {
            logger.error(err)
            if (err.message.includes('EADDRINUSE')) {
              logger.error(`Another process is using port ${serverPort}. Either kill that process or change this app's port number.`.bold)
            }
            process.exit(1)
          })
        }
      }

      function startupCallback (proto, port) {
        return async function () {
          // spin up reload http(s) service if enabled in dev mode
          if (appEnv === 'development' && params.frontendReload.enable === true) {
            let reloadServer
            const config = params.frontendReload

            // get reload ready and bind instance to express variable
            if (proto === 'HTTP') {
              reloadServer = await startReloadServer(proto)
              app.set('reloadHttpServer', reloadServer)
            } else {
              reloadServer = await startReloadServer(proto, httpsServer)
              app.set('reloadHttpsServer', reloadServer)
            }

            // spin up the reload server
            await reloadServer.startWebSocketServer()
            logger.log('🎧', `${appName} frontend reload ${proto} server is listening on port ${proto === 'HTTP' ? config.port : config.httpsPort}`)
          }

          logger.info('🎧', `${appName} ${proto} server listening on port ${port} (${appEnv} mode) ➡️  ${proto.toLowerCase()}://localhost:${port}`.bold)
          if (params.localhostOnly) {
            logger.warn(`${appName} will only respond to requests coming from localhost. If you wish to override this behavior and have it respond to requests coming from outside of localhost, then set "localhostOnly" to false. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt`)
          }
          if (!params.hostPublic) {
            logger.warn('Hosting of public folder is disabled. Your CSS, JS, images, and other files served via your public folder will not load unless you serve them via another web server. If you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set "hostPublic" to true. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt')
          }

          // fire user-defined onServerStart event
          if (params.onServerStart && typeof params.onServerStart === 'function') {
            params.onServerStart(app)
          }
        }
      }

      if (!params.https.force || !params.https.enable) {
        attemptServerStart(httpServer, params.port, 'HTTP')
      }
      if (params.https.enable) {
        attemptServerStart(httpsServer, params.https.port, 'HTTPS')
      }

      process.on('SIGTERM', shutdownGracefully)
      process.on('SIGINT', shutdownGracefully)
      clearInterval(interval)
    }, 100)
  }

  // shut down all servers, connections and threads that the roosevelt app is using
  function shutdownGracefully (args) {
    persistProcess = args?.persistProcess

    // fire user-defined onAppExit event
    if (params.onAppExit && typeof params.onAppExit === 'function') {
      params.onAppExit(app)
    }

    // force destroy connections if the server takes too long to shut down
    checkConnectionsTimeout = setTimeout(() => {
      logger.error(`${appName} could not close all connections in time; forcefully shutting down`)
      for (const key in connections) {
        connections[key].destroy()
      }
      if (persistProcess) {
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

    // if the app is in development mode, kill all connections instantly and exit
    if (appEnv === 'development') {
      for (const key in connections) {
        connections[key].destroy()
      }
      closeServer()
    } else {
      // else do the normal procedure of seeing if there are still connections before closing
      closeServerIfNoConnections()
    }
  }

  // assign individual keys to connections when opened so they can be destroyed gracefully
  function mapConnections (conn) {
    const key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn

    // once the connection closes, remove
    conn.on('close', function () {
      delete connections[key]
      if (app.get('roosevelt:state') === 'disconnecting') {
        closeServerIfNoConnections()
      }
    })
  }

  function closeServerIfNoConnections () {
    const connectionsAmount = Object.keys(connections)
    if (connectionsAmount.length === 0) {
      closeServer()
    }
  }

  function closeServer () {
    clearTimeout(checkConnectionsTimeout)
    logger.info('✅', `${appName} successfully closed all connections and shut down gracefully.`.green)
    if (persistProcess) {
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

  return {
    httpServer,
    httpsServer,
    expressApp: app,
    initServer,
    init: initServer,
    startServer,
    stopServer: shutdownGracefully
  }
}
