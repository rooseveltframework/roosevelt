require('@colors/colors')

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const appModulePath = require('./lib/tools/appModulePath')
const requireFromApp = require('./lib/tools/requireFromApp')
const Logger = require('roosevelt-logger')
const certsGenerator = require('./lib/scripts/certsGenerator.js')
const sessionSecretGenerator = require('./lib/scripts/sessionSecretGenerator.js')
const docsUrl = require('./lib/tools/docsUrl')
const { isTrustedByOS, mkcertInstallCommand } = require('./lib/tools/certTrust')

// the address other devices on the network can reach this app at, printed next to the localhost url on startup
//
// falls back to loopback when the machine has no network connection, so the startup log never prints an empty address
function networkAddress () {
  const external = Object.values(os.networkInterfaces()).flat().find(nic => nic?.family === 'IPv4' && !nic.internal)
  return external ? external.address : '127.0.0.1'
}

const roosevelt = (options = {}, schema) => {
  options.appDir = options.appDir || path.dirname(module.parent.filename) // appDir is either specified by the user or sourced from the parent require
  const connections = {}
  let httpServer
  let httpsServer
  let initialized = false
  let checkConnectionsTimeout
  let resolveShutdown // settles the promise stopServer returned, from wherever the shutdown finishes
  let shutdownFinished = false // a shutdown finishes once, however many connections close after it has
  let shutdownInProgress = null // the promise of the shutdown under way, which a second call or kill signal waits on rather than starting another
  let keepAliveTimeouts // the servers' keep alive timeouts from before a shutdown shortened them, put back once it is done
  let persistProcess
  let onAppExitDone // the promise of the app's onAppExit event, which a shutdown waits on before it exits
  let shutdownSettled = false // a shutdown exits or settles once, whether onAppExit finished or the shutdown timeout ran out first
  let logger
  let appName
  let appEnv
  let startupNotice

  // source user-supplied params
  const params = require('./lib/sourceParams')(options, schema)
  const appDir = params.appDir
  const pkg = params.pkg

  // express is a peer dependency, so the app supplies it rather than roosevelt bundling it, and it is loaded from the app so that the version it installed is the one that runs
  //
  // without it nothing below can work, and stopping here says so plainly instead of failing later in a way that does not name the cause
  //
  // this throws rather than exiting so that anything embedding roosevelt can catch it and decide for itself what to do
  let express
  try {
    express = requireFromApp(appDir, 'express', require)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes('\'express\'')) throw err // express being present but broken is reported as it is
    throw new Error('Roosevelt could not find Express. Express is a peer dependency, which means your app needs to install it itself. Run `npm install express` to fix this. Roosevelt supports Express 4 and Express 5.')
  }

  const app = express()
  const router = express.Router() // initialize router

  app.set('params', params) // expose app configuration
  if (params.deprecationChecks === true || (params.deprecationChecks === 'development-mode' && params.mode === 'development')) require('./lib/deprecationChecker.js')(options, params)

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

    // notices that repeat on every start are routed through here so that quieterStartup can show them less often
    startupNotice = require('./lib/tools/startupNotice')(app)

    // app starting message
    if (params.makeBuildArtifacts === 'staticsOnly') logger.info('💭', `Building ${appName} static site in ${appEnv} mode...`.bold)
    else logger.info('💭', `Starting ${appName} in ${appEnv} mode...`.bold)

    // generate express session secret
    if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly' && !fs.pathExistsSync(path.join(params.secretsPath, 'sessionSecret.json'))) sessionSecretGenerator(params.secretsPath)

    // assign individual keys to connections when opened so they can be destroyed gracefully
    function mapConnections (conn) {
      const key = conn.remoteAddress + ':' + conn.remotePort
      connections[key] = conn
      conn.on('close', function () {
        delete connections[key]
        if (app.get('roosevelt:state') === 'disconnecting') Object.keys(connections).length === 0 && finishShutdown() // this will close the server if there are no connections
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

      // auto generate certs if in dev mode, autoCert is enabled, and the cert configuration points at file paths
      //
      // the generator decides whether anything needs writing: it makes certs that are missing, replaces the ones it signed once they are near expiring, and leaves a certificate the app supplied itself alone
      if (app.get('env') === 'development' && params.https.autoCert && params.makeBuildArtifacts !== 'staticsOnly') {
        if (await certParamIsPath(httpsOptions.cert) && await certParamIsPath(httpsOptions.key)) {
          const certs = await certsGenerator(params.secretsPath, httpsOptions, params.https.caPath)

          // which authority signed it is said once, on the start that wrote it
          if (certs) {
            if (certs.certWasWritten) logger.info('🔐', `${appName} generated an HTTPS certificate signed by ${certs.signer === 'mkcert' ? 'mkcert' : `its own development authority at ${certs.caCertPath}`}.`.cyan)

            // nothing is said about a certificate the user supplied themselves, since whatever authority stands behind it is not roosevelt's business
            //
            // the certificate is checked alongside the authority that signed it, because trusting the certificate itself is what people do when they trust one by hand, and nagging someone about a certificate their machine already accepts is worse than saying nothing at all
            //
            // only an outright false counts: an authority that could not be read says nothing either way, and sending someone to fix what may not be broken is the wrong direction to guess in
            if (params.https.autoCertWarning && certs.certIsOurs !== false && isTrustedByOS(certs.caCertPath) === false && isTrustedByOS(certs.certPath) === false) {
              if (certs.signer === 'mkcert') startupNotice('mkcertNotTrusted', '🔓', `mkcert is installed, but this machine does not trust its authority yet, so your browser will warn about this app's HTTPS certificate. Run \`mkcert -install\`, then restart your browser and restart this app. More info: ${docsUrl}/config-http`)
              else startupNotice('mkcertMissing', '🔓', `Your browser will warn about this app's HTTPS certificate because it is untrusted. Install mkcert so Roosevelt can generate one your browser accepts:\n\n    ${mkcertInstallCommand()}\n    mkcert -install\n\nThen restart your browser and restart this app. More info: ${docsUrl}/config-http`)
            }
          }
        }
      }

      // add support for supplying file paths to some https options
      if (httpsOptions.ca) httpsOptions.ca = await preprocessCertParams(httpsOptions.ca)
      if (httpsOptions.cert) httpsOptions.cert = await preprocessCertParams(httpsOptions.cert)
      if (httpsOptions.key) httpsOptions.key = await preprocessCertParams(httpsOptions.key)
      if (httpsOptions.pfx) httpsOptions.pfx = await preprocessCertParams(httpsOptions.pfx)

      // if a given cert param is a file path replace it with the contents of the cert file
      //
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

      // a server that cannot be made stops the start, with an error that initServer and startServer reject with. this used to exit the process with a code that said it succeeded for an empty cert, and for anything else to log the error and then fail with an unrelated one on the server that was never made
      try {
        httpsServer = require('https').createServer(httpsOptions, app)
      } catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') throw new Error('Cannot start HTTPS server because the HTTPS cert appears to be empty. This error happens most commonly when you forget to generate them first. Run `npx roosevelt-generate-certs` in your app directory, then start the server again.', { cause: error })
        throw new Error(`Cannot start HTTPS server because the HTTPS options could not be used: ${error.message}. Check the \`https.options\` param. More info: ${docsUrl}/config-http`, { cause: error })
      }
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

    // the sitemap, which is made here so that controllers and events can add urls to it
    app.set('sitemap', require('./lib/sitemap')(app))

    // tracks which files each static file was built from so the build steps can skip the ones that did not change
    //
    // it is made here rather than alongside the build steps below so that params derived after this point, such as the absolute error page paths that mapRoutes works out, are not part of its fingerprint
    app.set('buildCache', require('./lib/tools/buildCache')(app))

    require('./lib/htmlMinifier')(app)

    if (app.get('env') === 'development' && params.htmlValidator.enable) {
      // instantiate the validator if it's installed
      try {
        require('express-html-validator')(app, params.htmlValidator)
      } catch { }
    }

    require('./lib/injectReload')(app)

    // fire user-defined onBeforeControllers event
    if (params.onBeforeControllers && typeof params.onBeforeControllers === 'function') await Promise.resolve(params.onBeforeControllers(app))

    await require('./lib/mapRoutes')(app)

    await require('./lib/buildStatics')(app)

    // fire user-defined onServerInit event
    if (params.onServerInit && typeof params.onServerInit === 'function') await Promise.resolve(params.onServerInit(app))

    // done last, so that every route has been added and the urls it lists can come from anything onServerInit set up, such as a database connection
    await app.get('sitemap').review()
    await app.get('sitemap').write()
  }

  async function startServer (args) {
    if (args) throw new Error('Roosevelt\'s startServer method does not take arguments. You may have meant to pass parameters to Roosevelt\'s constructor instead.')
    await initServer()

    if (params.buildOnly) return

    // a session store that an earlier stopServer closed is opened again, for an app started again after it was stopped. on a first start there is nothing to reopen and this does nothing
    app.get('expressSessionStore')?.reopen?.()

    let listeningServers = 0
    let numberOfServers = 0
    if (params.http.enable) numberOfServers++
    if (params.https.enable) numberOfServers++

    await new Promise((resolve, reject) => {
      function startupCallback (proto, port) {
        return async function () {
          logger.info('🎧', `${appName} ${proto} server listening on port ${port} (${appEnv} mode) ➡️  ${proto.toLowerCase()}://${params.localhostOnly ? '127.0.0.1' : 'localhost'}:${port} (${proto.toLowerCase()}://${networkAddress()}:${port})`.bold)
          if (params.localhostOnly) startupNotice('localhostOnly', `${appName} will only respond to requests coming from localhost. If you wish to override this behavior and have it respond to requests coming from outside of localhost, then set "localhostOnly" to false. See the Roosevelt documentation for more information: ${docsUrl}/config-deployment`)
          if (!params.hostPublic) startupNotice('hostPublicDisabled', `Hosting of public folder is disabled. Your CSS, JS, images, and other files served via your public folder will not load unless you serve them via another web server. If you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set "hostPublic" to true. See the Roosevelt documentation for more information: ${docsUrl}/config-deployment`)
          listeningServers++

          // fire user-defined onServerStart event if all servers are started
          //
          // nothing waits on this function's own promise, since a server calls it, so an onServerStart that fails has to reject startServer's promise from here, or it would go unhandled and startServer would never settle
          if (listeningServers === numberOfServers) {
            try {
              if (params.onServerStart && typeof params.onServerStart === 'function') await Promise.resolve(params.onServerStart(app))
              resolve() // resolve the promise when all servers are started
            } catch (err) {
              reject(err)
            }
          }
        }
      }

      if (!numberOfServers) {
        logger.warn('You called startServer but both http and https are disabled, so no servers are starting.')
        resolve() // no servers to start, resolve immediately
      }

      // starts a server listening, rejecting startServer's promise if it cannot
      //
      // the listener for a failed listen goes once the server is listening, and only a port already in use is reported as one, so that an error the server raises later is logged as what it is rather than as a port conflict
      //
      // a localhost only server listens on 127.0.0.1 rather than on the name localhost, which can resolve to the ipv6 loopback alone and leave a web server in front that connects to 127.0.0.1 refused
      function listen (server, proto, port) {
        function onListenError (err) {
          logger.error(err)
          if (err.code === 'EADDRINUSE') logger.error(`Another process is using port ${port}. Either kill that process or change this app's port number.`.bold)
          reject(err)
        }
        server.once('error', onListenError)
        server.once('listening', () => {
          server.removeListener('error', onListenError)
          server.removeListener('error', logServerError) // in case startServer is called more than once on the same app
          server.on('error', logServerError)
        })
        return server
          .listen(port, params.localhostOnly ? '127.0.0.1' : null, startupCallback(proto, port))
          .on('close', stopListeningForKillSignals)
      }

      if (params.http.enable) {
        const server = listen(httpServer, 'HTTP', params.http.port)
        if (appEnv === 'development' && params.frontendReload.enable) {
          require('express-browser-reload')(app.get('router'), server, params?.frontendReload?.expressBrowserReloadParams)
          trackReloadSockets(server) // registered after the line above so that its own upgrade handler stays in place
        }
      }
      if (params.https.enable) {
        const server = listen(httpsServer, 'HTTPS', params.https.port)
        if (appEnv === 'development' && params.frontendReload.enable) {
          require('express-browser-reload')(app.get('router'), server, params?.frontendReload?.expressBrowserReloadParams)
          trackReloadSockets(server) // registered after the line above so that its own upgrade handler stays in place
        }
      }
    })

    // rebuild the static files as their sources are edited, and reload the browser once that is done
    require('./lib/watchStatics')(app)

    // listen for kill signals so the app can shut down gracefully
    //
    // the listeners are removed first in case startServer is called more than once on the same app, which would otherwise register duplicates
    process.removeListener('SIGTERM', shutdownGracefully)
    process.removeListener('SIGINT', shutdownGracefully)
    process.on('SIGTERM', shutdownGracefully)
    process.on('SIGINT', shutdownGracefully)
  }

  // shut down all servers, connections, and threads that the roosevelt app is using
  function shutdownGracefully (args) {
    // a shutdown already under way is waited on rather than started again, which would fire onAppExit twice and leave the first caller's promise to settle on its own
    if (shutdownInProgress) return shutdownInProgress

    persistProcess = args?.persistProcess

    // return a promise to make shutdownGracefully awaitable
    shutdownInProgress = new Promise(resolve => {
      // a shutdown that has to wait for connections to close finishes when the last one does, in the connection's close handler, so that is where this has to be settled from too
      resolveShutdown = resolve
      shutdownFinished = false
      shutdownSettled = false

      // fire user-defined onAppExit event
      //
      // it runs alongside the connections closing, and the shutdown waits for it to finish before it exits, so that work it does asynchronously, such as closing a database, is not cut off by the process exiting under it. one that fails is logged rather than left to crash the process or stop the shutdown
      let onAppExitResult
      try {
        if (params.onAppExit && typeof params.onAppExit === 'function') onAppExitResult = params.onAppExit(app)
      } catch (err) {
        onAppExitResult = Promise.reject(err)
      }
      onAppExitDone = Promise.resolve(onAppExitResult).catch(err => {
        logger.error(`${appName} onAppExit event failed:`)
        logger.error(err)
      })

      // force destroy connections if the server takes too long to shut down
      //
      // the same timeout also bounds the wait for onAppExit, so one that never finishes cannot keep the process from exiting
      clearTimeout(checkConnectionsTimeout)
      checkConnectionsTimeout = setTimeout(() => {
        if (shutdownFinished) {
          logger.error(`${appName} onAppExit event did not finish in time; shutting down without waiting for it`)
          exitOrSettle()
          return
        }
        logger.error(`${appName} could not close all connections in time; forcefully shutting down`)
        finishShutdown({ forced: true })
      }, params.shutdownTimeout)

      app.set('roosevelt:state', 'disconnecting')
      logger.info('\n💭 ', `${appName} received kill signal, attempting to shut down gracefully.`.magenta)

      // stop accepting new connections, while the ones already open carry on. a server that kept listening until the last connection closed kept taking new ones all the while, so a busy app could take until shutdownTimeout to shut down, and then cut off the requests it had just taken
      //
      // connections sitting idle between requests are closed now, and the rest soon after their response is sent, rather than waiting out the keep alive timeout for a next request that would only be refused
      keepAliveTimeouts = new Map()
      for (const server of [httpServer, httpsServer]) {
        if (!server?.listening) continue
        server.close()
        server.closeIdleConnections?.()
        keepAliveTimeouts.set(server, server.keepAliveTimeout)
        server.keepAliveTimeout = 1
      }

      // if the app is in development mode, kill all connections instantly and exit
      if (appEnv === 'development') {
        for (const key in connections) connections[key].destroy()
        finishShutdown()
      } else {
        // else do the normal procedure of seeing if there are still connections before closing
        if (Object.keys(connections).length === 0) finishShutdown()
      }
    })
    return shutdownInProgress
  }

  // remembers the sockets the browser reload script opens
  //
  // this allows for auto-reloading the page without bringing down the process
  function trackReloadSockets (server) {
    let sockets = app.get('reloadSockets')
    if (!sockets) {
      sockets = new Set()
      app.set('reloadSockets', sockets)
    }
    server.on('upgrade', (req, socket) => {
      sockets.add(socket)
      socket.on('close', () => sockets.delete(socket))
    })
  }

  // logs an error a server raises after it has started listening, which would otherwise crash the process for want of a listener
  function logServerError (err) {
    logger.error(err)
  }

  // once this app has no servers left listening, stop listening for kill signals on its behalf
  //
  // without this, every app started in a single process would leave its listeners behind and node would eventually warn about a memory leak
  //
  // this is keyed off the servers closing rather than off shutdownGracefully so that it also happens when the servers are closed directly
  function stopListeningForKillSignals () {
    if (httpServer?.listening || httpsServer?.listening) return
    process.removeListener('SIGTERM', shutdownGracefully)
    process.removeListener('SIGINT', shutdownGracefully)
  }

  // finishes a shutdown, whether every connection closed in time or the shutdown timeout ran out first, so that both clean up the same way. the timeout used to skip closing the file watchers and the session store and resetting roosevelt:state, which left an app that persisted its process looking like it was still shutting down
  function finishShutdown ({ forced } = {}) {
    // the last connection closing, a development mode shutdown, and the shutdown timeout can all get here for the same shutdown
    if (shutdownFinished) return
    shutdownFinished = true

    // stop watching for edits, or a rebuild could fire against an app that is no longer listening
    for (const watcher of app.get('staticsWatchers') || []) watcher.close()
    app.set('staticsWatchers', null)

    // and stop the session store's clearing out of expired sessions, which would otherwise keep a process that stays running, as a test does, from exiting, and close the sqlite database roosevelt opened for the default store, which would otherwise stay locked
    app.get('expressSessionStore')?.close?.()

    // the connections are destroyed only once the shutdown is marked finished, so that the close handlers they set off do not finish it a second time
    if (forced) for (const key in connections) connections[key].destroy()
    else logger.info('✅', `${appName} successfully closed all connections and shut down gracefully.`.green)

    // put back the keep alive timeouts the shutdown shortened, in case the app is started again
    for (const [server, timeout] of keepAliveTimeouts || []) server.keepAliveTimeout = timeout
    keepAliveTimeouts = null

    // a forced shutdown has already used up the time it was given, so it does not wait any longer on onAppExit
    if (forced) exitOrSettle()
    else onAppExitDone.then(exitOrSettle)
  }

  // exits the process, or when it is to persist, settles the promise stopServer returned once the servers have closed
  function exitOrSettle () {
    if (shutdownSettled) return
    shutdownSettled = true
    clearTimeout(checkConnectionsTimeout)

    let serversToClose = 0
    let closedServers = 0

    function settle () {
      app.set('roosevelt:state', null)
      shutdownInProgress = null
      if (resolveShutdown) resolveShutdown() // resolve the promise when all servers are closed
    }

    function onServerClosed () {
      closedServers++
      if (closedServers === serversToClose) settle()
    }

    if (persistProcess) {
      // a server the shutdown already closed still calls back here, once it has no connections left
      if (httpServer) {
        serversToClose++
        httpServer.close(() => onServerClosed())
      }
      if (httpsServer) {
        serversToClose++
        httpsServer.close(() => onServerClosed())
      }
    } else process.exit()

    // if no servers are active, resolve immediately
    if (serversToClose === 0) settle()
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
