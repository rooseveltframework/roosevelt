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

  app.set('params', params) // expose app configuration
  require('./lib/deprecationChecker.js')(options, params)

  // utility functions

  async function initServer (args) {
    if (args) throw new Error('Roosevelt\'s initServer method does not take arguments. You may have meant to pass parameters to Roosevelt\'s constructor instead.')
    if (initialized) return
    initialized = true

    // configure logger with params
    logger = new Logger(params.logging)

    // expose express variables
    app.set('express', express)
    app.set('router', router)
    app.set('env', params.mode === 'production-proxy' ? 'production' : params.mode)
    app.set('logger', logger) // expose instance of roosevelt-logger module
    app.set('appDir', appDir)
    app.set('package', pkg) // expose contents of package.json if any
    app.set('appName', pkg.name || 'Roosevelt Express')
    app.set('appVersion', pkg.version)
    app.set('routePrefix', params.routePrefix)
    app.set('modelsPath', params.modelsPath)
    app.set('viewsPath', params.viewsPath)
    app.set('preprocessedViewsPath', params.preprocessedViewsPath)
    app.set('preprocessedStaticsPath', params.preprocessedStaticsPath)
    app.set('controllersPath', params.controllersPath)
    app.set('staticsRoot', params.staticsRoot)
    app.set('htmlPath', params.html.sourcePath)
    app.set('htmlModels', params.html.models)
    app.set('cssPath', params.css.sourcePath)
    app.set('jsPath', params.js.sourcePath)
    app.set('htmlRenderedOutput', params.html.output)
    app.set('cssCompiledOutput', params.css.output)
    app.set('buildFolder', params.buildFolder)
    app.set('clientControllersBundledOutput', params.clientControllers.output)
    app.set('clientViewsBundledOutput', params.clientViews.output)
    app.set('publicFolder', params.unversionedPublic)

    // make the app directory requirable
    appModulePath.addPath(appDir)

    // make the models directory requirable
    appModulePath.addPath(path.join(params.modelsPath, '../'))
    appModulePath.addPath(params.html.sourcePath) // make any js files in the staticsRoot html sourcePath requirable as well so you can have a models folder on static sites as well

    // make the controllers directory requirable
    appModulePath.addPath(path.join(params.controllersPath, '../'))

    appName = app.get('appName')
    appEnv = app.get('env')

    // app starting message
    if (params.makeBuildArtifacts === 'staticsOnly') logger.info('💭', `Building ${appName} static site in ${appEnv} mode...`.bold)
    else logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)

    // generate express session secret
    if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly' && !fs.pathExistsSync(path.join(params.secretsPath, 'sessionSecret.json'))) sessionSecretGenerator(params.secretsPath)

    // generate csrf secret
    if (params.csrfProtection && params.makeBuildArtifacts !== 'staticsOnly' && !fs.pathExistsSync(path.join(params.secretsPath, 'csrfSecret.json'))) csrfSecretGenerator(params.secretsPath)

    // assign individual keys to connections when opened so they can be destroyed gracefully
    function mapConnections (conn) {
      const key = conn.remoteAddress + ':' + conn.remotePort
      connections[key] = conn
      conn.on('close', function () {
        delete connections[key]
        if (app.get('roosevelt:state') === 'disconnecting') Object.keys(connections).length === 0 && closeServer() // this will close the server if there are no connections
      })
    }

    // setup http server
    if (params.http.enable) {
      httpServer = require('http').createServer(app)
      httpServer.on('connection', mapConnections)
    }

    // setup https server
    if (params.https.enable) {
      const httpsOptions = params.https.options

      // auto generate certs if in dev mode, autoCert is enabled, the cert configuration points at file paths, and those cert files don't exist already
      if (app.get('env') === 'development' && params.https.autoCert && params.makeBuildArtifacts !== 'staticsOnly') {
        if (await certParamIsPath(httpsOptions.cert) && await certParamIsPath(httpsOptions.key)) {
          if (!fs.pathExistsSync(httpsOptions.key) && !fs.pathExistsSync(httpsOptions.cert)) {
            certsGenerator(params.secretsPath, httpsOptions)
          }
        }
      }

      // add support for supplying file paths to some https options
      if (httpsOptions.ca) httpsOptions.ca = await preprocessCertParams(httpsOptions.ca)
      if (httpsOptions.cert) httpsOptions.cert = await preprocessCertParams(httpsOptions.cert)
      if (httpsOptions.key) httpsOptions.key = await preprocessCertParams(httpsOptions.key)
      if (httpsOptions.pfx) httpsOptions.pfx = await preprocessCertParams(httpsOptions.pfx)

      // if a given cert param is a file path replace it with the contents of the cert file
      // cert params natively support passing strings, buffers, and arrays of strings and/or buffers
      async function preprocessCertParams (certParam) {
        if (Array.isArray(certParam)) {
          // this type of loop allows redefining the values in the array
          for (let i = 0; i < certParam.length; i++) {
            if (await certParamIsPath(certParam[i], true)) certParam[i] = await fs.readFile(path.join(params.secretsPath, certParam[i]))
          }
        } else {
          if (await certParamIsPath(certParam, true)) certParam = await fs.readFile(path.join(params.secretsPath, certParam))
        }

        return certParam
      }

      async function certParamIsPath (certParam, checkIfExists) {
        if (typeof certParam !== 'string') return false

        if (checkIfExists) {
          const certPath = path.join(params.secretsPath, certParam)
          try {
            const stats = await fs.lstat(certPath)
            if (stats.isFile()) return true
            else return false
          } catch {
            return false
          }
        } else {
          if (certParam.endsWith('.pem')) return true
          else return false
        }
      }

      httpsServer = require('https').createServer(httpsOptions, app)
      httpsServer.on('connection', mapConnections)
    }

    // expose http server(s) to the user via express var
    app.set('httpServer', httpServer)
    app.set('httpsServer', httpsServer)

    // fire user-defined onBeforeMiddleware event
    if (params.onBeforeMiddleware && typeof params.onBeforeMiddleware === 'function') await Promise.resolve(params.onBeforeMiddleware(app))

    // enable gzip compression
    app.use(require('compression')())

    // enable favicon support
    if (params.favicon !== 'none' && params.favicon !== null) {
      const faviconPath = path.join(params.staticsRoot, params.favicon)
      if (fs.pathExistsSync(faviconPath)) app.use(require('serve-favicon')(faviconPath))
      else logger.warn(`Favicon ${params.favicon} does not exist. Please ensure the "favicon" param is configured correctly.`)
    }

    require('./lib/setExpressConfigs')(app)

    require('./lib/generateSymlinks')(app)

    require('./lib/copyFiles')(app)

    require('./lib/htmlMinifier')(app)

    if (app.get('env') === 'development' && params.htmlValidator.enable) {
      // instantiate the validator if it's installed
      try {
        require('express-html-validator')(app, params.htmlValidator)
      } catch { }
    }

    require('./lib/injectReload')(app)

    await require('./lib/mapRoutes')(app)

    await require('./lib/preprocessViewsAndStatics')(app)

    await require('./lib/preprocessStaticPages')(app)

    await require('./lib/preprocessCss')(app)

    await require('./lib/controllersBundler')(app)

    await require('./lib/viewsBundler')(app)

    await require('./lib/jsBundler')(app)

    // fire user-defined onServerInit event
    if (params.onServerInit && typeof params.onServerInit === 'function') await Promise.resolve(params.onServerInit(app))
  }

  async function startServer (args) {
    if (args) throw new Error('Roosevelt\'s startServer method does not take arguments. You may have meant to pass parameters to Roosevelt\'s constructor instead.')
    await initServer()
    let listeningServers = 0
    let numberOfServers = 0
    if (params.http.enable) numberOfServers++
    if (params.https.enable) numberOfServers++

    await new Promise((resolve, reject) => {
      function startupCallback (proto, port) {
        return async function () {
          logger.info('🎧', `${appName} ${proto} server listening on port ${port} (${appEnv} mode) ➡️  ${proto.toLowerCase()}://localhost:${port} (${proto.toLowerCase()}://${require('ip').address()}:${port})`.bold)
          if (params.localhostOnly) logger.warn(`${appName} will only respond to requests coming from localhost. If you wish to override this behavior and have it respond to requests coming from outside of localhost, then set "localhostOnly" to false. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt`)
          if (!params.hostPublic) logger.warn('Hosting of public folder is disabled. Your CSS, JS, images, and other files served via your public folder will not load unless you serve them via another web server. If you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set "hostPublic" to true. See the Roosevelt documentation for more information: https://github.com/rooseveltframework/roosevelt')
          listeningServers++

          // fire user-defined onServerStart event if all servers are started
          if (listeningServers === numberOfServers) {
            if (params.onServerStart && typeof params.onServerStart === 'function') await Promise.resolve(params.onServerStart(app))
            resolve() // resolve the promise when all servers are started
          }
        }
      }

      if (params.makeBuildArtifacts !== 'staticsOnly') {
        if (!numberOfServers) {
          logger.warn('You called startServer but both http and https are disabled, so no servers are starting.')
          resolve() // no servers to start, resolve immediately
        }

        if (params.http.enable) {
          const server = httpServer
            .listen(params.http.port, params.localhostOnly ? 'localhost' : null, startupCallback('HTTP', params.http.port))
            .on('error', err => {
              logger.error(err)
              logger.error(`Another process is using port ${params.http.port}. Either kill that process or change this app's port number.`.bold)
              reject(err)
            })
          if (appEnv === 'development' && params.frontendReload.enable) require('express-browser-reload')(app.get('router'), server, params?.frontendReload?.expressBrowserReloadParams)
        }
        if (params.https.enable) {
          const server = httpsServer
            .listen(params.https.port, params.localhostOnly ? 'localhost' : null, startupCallback('HTTPS', params.https.port))
            .on('error', err => {
              logger.error(err)
              logger.error(`Another process is using port ${params.https.port}. Either kill that process or change this app's port number.`.bold)
              reject(err)
            })
          if (appEnv === 'development' && params.frontendReload.enable) require('express-browser-reload')(app.get('router'), server, params?.frontendReload?.expressBrowserReloadParams)
        }
      }
    })

    process.on('SIGTERM', shutdownGracefully)
    process.on('SIGINT', shutdownGracefully)
  }

  // shut down all servers, connections, and threads that the roosevelt app is using
  async function shutdownGracefully (args) {
    persistProcess = args?.persistProcess

    // return a promise to make shutdownGracefully awaitable
    return new Promise((resolve, reject) => {
      // fire user-defined onAppExit event
      if (params.onAppExit && typeof params.onAppExit === 'function') params.onAppExit(app)

      // force destroy connections if the server takes too long to shut down
      checkConnectionsTimeout = setTimeout(() => {
        logger.error(`${appName} could not close all connections in time; forcefully shutting down`)
        for (const key in connections) connections[key].destroy()
        if (persistProcess) {
          if (httpServer) httpServer.close()
          if (httpsServer) httpsServer.close()
        } else {
          process.exit()
        }
        resolve() // resolve the promise after forceful shutdown
      }, params.shutdownTimeout)

      app.set('roosevelt:state', 'disconnecting')
      logger.info('\n💭 ', `${appName} received kill signal, attempting to shut down gracefully.`.magenta)

      // if the app is in development mode, kill all connections instantly and exit
      if (appEnv === 'development') {
        for (const key in connections) connections[key].destroy()
        closeServer(resolve) // pass resolve to closeServer to resolve the promise
      } else {
        // else do the normal procedure of seeing if there are still connections before closing
        if (Object.keys(connections).length === 0) closeServer(resolve) // pass resolve to closeServer to resolve the promise
      }
    })
  }

  function closeServer (resolve) {
    clearTimeout(checkConnectionsTimeout)
    logger.info('✅', `${appName} successfully closed all connections and shut down gracefully.`.green)
    if (persistProcess) {
      if (httpServer) httpServer.close()
      if (httpsServer) httpsServer.close()
    } else process.exit()
    if (resolve) resolve() // resolve the promise to indicate shutdown is complete (if this was used in shutdownGracefully)
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
