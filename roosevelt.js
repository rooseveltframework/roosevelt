require('@colors/colors')
const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const appModulePath = require('app-module-path')
const Logger = require('roosevelt-logger')
const certsGenerator = require('./lib/scripts/certsGenerator.js')
const sessionSecretGenerator = require('./lib/scripts/sessionSecretGenerator.js')
const csrfSecretGenerator = require('./lib/scripts/csrfSecretGenerator.js')

const roosevelt = (options = {}, schema) => {
  options.appDir = options.appDir || path.dirname(module.parent.filename) // appDir is either specified by the user or sourced from the parent require
  const connections = {}
  const app = express() // initialize express
  const router = express.Router() // initialize router
  let httpServer
  let httpsServer
  let initialized = false
  let checkConnectionsTimeout
  let persistProcess
  let logger
  let appName
  let appEnv

  // source user-supplied params
  const params = require('./lib/sourceParams')(options, schema)
  const appDir = params.appDir
  const pkg = params.pkg

  // use existence of public folder to determine if this is the first run
  if (!fs.pathExistsSync(params.publicFolder) && params.logging.methods.info) {
    // run the param audit
    require('./lib/scripts/configAuditor').audit(params.appDir)
    require('./lib/scripts/deprecationCheck')(params.appDir)
  }

  // utility functions

  async function initServer () {
    if (initialized) return
    initialized = true

    // configure logger with params
    logger = new Logger(params.logging)

    // expose express variables
    app.set('express', express)
    app.set('router', router)
    app.set('env', params.mode === 'production-proxy' ? 'production' : params.mode)
    app.set('logger', logger) // expose instance of roosevelt-logger module
    app.set('params', params) // expose app configuration
    app.set('appDir', appDir)
    app.set('package', pkg) // expose contents of package.json if any
    app.set('appName', pkg.name || 'Roosevelt Express')
    app.set('appVersion', pkg.version)
    app.set('routePrefix', params.routePrefix)
    app.set('modelsPath', path.join(appDir, params.modelsPath))
    app.set('viewsPath', path.join(appDir, params.viewsPath))
    app.set('controllersPath', path.join(appDir, params.controllersPath))
    app.set('staticsRoot', params.staticsRoot)
    app.set('htmlPath', params.html.sourcePath)
    app.set('htmlModels', params.html.models)
    app.set('cssPath', params.css.sourcePath)
    app.set('jsPath', params.js.sourcePath)
    app.set('htmlRenderedOutput', params.html.output)
    app.set('cssCompiledOutput', params.css.output)
    app.set('clientViewsBundledOutput', params.clientViews.output)
    app.set('isomorphicControllersListOutput', params.isomorphicControllers.output)
    app.set('publicFolder', params.unversionedPublic)

    // make the app directory requirable
    appModulePath.addPath(appDir)

    // make the models directory requirable
    appModulePath.addPath(path.join(appDir, params.modelsPath, '../'))

    // make the controllers directory requirable
    appModulePath.addPath(path.join(appDir, params.controllersPath, '../'))

    appName = app.get('appName')
    appEnv = app.get('env')

    // app starting message
    if (params.makeBuildArtifacts === 'staticsOnly') logger.info('💭', `Building ${appName} static site in ${appEnv} mode...`.bold)
    else logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)

    // generate express session secret
    if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly') {
      if (!fs.pathExistsSync(params.secretsDir) || !fs.pathExistsSync(params.secretsDir + '/sessionSecret.json')) {
        sessionSecretGenerator()
      }
    }

    // generate csrf secret
    if (params.csrfProtection && params.makeBuildArtifacts !== 'staticsOnly') {
      if (!fs.pathExistsSync(params.secretsDir) || !fs.pathExistsSync(params.secretsDir + '/csrfSecret.json')) {
        csrfSecretGenerator()
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
          Object.keys(connections).length === 0 && closeServer() // this will close the server if there are no connections
        }
      })
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

        if ((!fs.pathExistsSync(params.secretsDir) || (!fs.pathExistsSync(authCertAndKey.key) || (!fs.pathExistsSync(authCertAndKey.cert))))) {
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

    // fire user-defined onBeforeMiddleware event
    if (params.onBeforeMiddleware && typeof params.onBeforeMiddleware === 'function') {
      await Promise.resolve(params.onBeforeMiddleware(app))
    }

    // enable gzip compression
    app.use(require('compression')())

    // enable favicon support
    if (params.favicon !== 'none' && params.favicon !== null) {
      const faviconPath = path.join(params.staticsRoot, params.favicon)
      if (fs.pathExistsSync(faviconPath)) app.use(require('serve-favicon')(faviconPath))
      else logger.warn(`Favicon ${params.favicon} does not exist. Please ensure the "favicon" param is configured correctly.`)
    }

    // configure express, express-session, and csrf
    require('./lib/setExpressConfigs')(app)

    require('./lib/generateSymlinks')(app)

    require('./lib/htmlMinifier')(app)

    await require('./lib/preprocessStaticPages')(app)

    await require('./lib/preprocessCss')(app)

    await require('./lib/viewsBundler')(app)

    await require('./lib/jsBundler')(app)

    if (app.get('env') === 'development' && params.htmlValidator.enable) {
      // instantiate the validator if it's installed
      try {
        require('express-html-validator')(app, params.htmlValidator)
      } catch { }
    }

    require('./lib/injectReload')(app)

    // map routes
    await require('./lib/mapRoutes')(app)

    // custom error page
    app.use((err, req, res, next) => {
      logger.error(err.stack)
      require(params.errorPages.internalServerError)(app, err, req, res)
    })

    await require('./lib/isomorphicControllersFinder')(app)

    // fire user-defined onServerInit event
    if (params.onServerInit && typeof params.onServerInit === 'function') {
      await Promise.resolve(params.onServerInit(app))
    }
  }

  async function startServer () {
    await initServer()

    // code that executes after the server starts
    function startupCallback (proto, port) {
      async function startReloadServer (proto, server) {
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
          Promise.resolve(params.onServerStart(app))
        }
      }
    }

    if (params.makeBuildArtifacts !== 'staticsOnly') {
      if (!params.https.force || !params.https.enable) {
        try {
          await httpServer.listen(params.port, (params.localhostOnly ? 'localhost' : null), startupCallback('HTTP', params.port))
        } catch (err) {
          logger.error(err)
          logger.error(`Another process is using port ${params.port}. Either kill that process or change this app's port number.`.bold)
          process.exit(1)
        }
      }
      if (params.https.enable) {
        try {
          await httpsServer.listen(params.https.port, (params.localhostOnly ? 'localhost' : null), startupCallback('HTTPS', params.https.port))
        } catch (err) {
          logger.error(err)
          logger.error(`Another process is using port ${params.https.port}. Either kill that process or change this app's port number.`.bold)
          process.exit(1)
        }
      }
    }

    process.on('SIGTERM', shutdownGracefully)
    process.on('SIGINT', shutdownGracefully)
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
      Object.keys(connections).length === 0 && closeServer() // this will close the server if there are no connections
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
    expressApp: app,
    initServer,
    init: initServer,
    startServer,
    start: startServer,
    stopServer: shutdownGracefully,
    stop: shutdownGracefully
  }
}

module.exports = roosevelt
