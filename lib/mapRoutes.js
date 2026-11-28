const fs = require('fs-extra')
const path = require('path')
const walk = require('./tools/walkFiles')
const docsUrl = require('./tools/docsUrl')
const setDebugMarkup = require('./tools/debugMarkup')

module.exports = async app => {
  const express = app.get('express')
  const router = app.get('router')
  const appName = app.get('appName')
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')
  const prefix = params.routePrefix

  // store all routes on the `routes` express var
  function indexAllRoutes () {
    const routes = []
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        let methods = Object.keys(middleware.route.methods).join(', ').toUpperCase()
        if (Object.keys(methods).length === 0) methods = 'GET'
        routes.push({ path: middleware.route.path, methods })
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            let methods = Object.keys(handler.route.methods).join(', ').toUpperCase()
            if (Object.keys(methods).length === 0) methods = 'GET'
            routes.push({ path: handler.route.path, methods })
          }
        })
      }
    })
    app.set('routes', routes)
  }
  indexAllRoutes()

  // ensure 404 page exists
  params.errorPages.notFound = path.join(app.get('controllersPath'), params.errorPages.notFound)
  if (!fs.pathExistsSync(params.errorPages.notFound)) {
    params.errorPages.notFound = path.join(__dirname, '../defaultErrorPages/controllers/404')
  }

  // ensure 403 page exists
  params.errorPages.forbidden = path.join(app.get('controllersPath'), params.errorPages.forbidden)
  if (!fs.pathExistsSync(params.errorPages.forbidden)) {
    params.errorPages.forbidden = path.join(__dirname, '../defaultErrorPages/controllers/403')
  }

  // ensure 500 page exists
  params.errorPages.internalServerError = path.join(app.get('controllersPath'), params.errorPages.internalServerError)
  if (!fs.pathExistsSync(params.errorPages.internalServerError)) {
    params.errorPages.internalServerError = path.join(__dirname, '../defaultErrorPages/controllers/5xx')
  }

  // ensure 503 page exists
  params.errorPages.serviceUnavailable = path.join(app.get('controllersPath'), params.errorPages.serviceUnavailable)
  if (!fs.pathExistsSync(params.errorPages.serviceUnavailable)) {
    params.errorPages.serviceUnavailable = path.join(__dirname, '../defaultErrorPages/controllers/503')
  }

  // generate mvc directories
  if (params.makeBuildArtifacts && params.makeBuildArtifacts !== 'staticsOnly') {
    fsr.ensureDirSync(app.get('modelsPath'))
    fsr.ensureDirSync(app.get('viewsPath'))
    fsr.ensureDirSync(app.get('controllersPath'))
  }

  // map statics for developer mode
  //
  // with versionedPublic, every file in the public folder's version folder changes address whenever the app's version does, so a browser can keep one for as long as it likes, and never has to ask whether it has changed, which it does for anything served without saying so. a web server serving the public folder in the app's place, as in production-proxy mode, should send the same header for it
  if (params.hostPublic || app.get('env') === 'development') {
    const versioned = params.versionedPublic && app.get('env') !== 'development' ? path.resolve(params.publicFolder) + path.sep : null // development mode rebuilds files without changing their address, so it is left to the browser to check them
    app.use(prefix || '/', express.static(app.get('publicFolder'), {
      setHeaders: (res, file) => {
        if (versioned && path.resolve(file).startsWith(versioned)) res.set('Cache-Control', 'public, max-age=31536000, immutable')
      }
    }))
  }

  // the step that builds the 404 page's debug markup, in development mode, which is kept right before the catch-all route below
  let debugMarkupLayer

  // define a function to move the 404 controller (the catch-all route) to the end
  function moveWildcardRouteToEnd (stack) {
    const isWildcard = layer => layer.route && layer.route.path.startsWith('*')
    const wildcardIndex = stack.findIndex(isWildcard)
    if (wildcardIndex !== -1) {
      const [wildcardRoute] = stack.splice(wildcardIndex, 1)
      stack.push(wildcardRoute)
    }

    // the debug markup step moves with it, so that only requests the 404 page is about to answer build the markup. routes can be added after this module has run, such as frontend reload's and any onServerInit adds, and a step left where it was added would build the markup for those too, on pages that are not error pages
    const debugIndex = debugMarkupLayer ? stack.indexOf(debugMarkupLayer) : -1
    if (debugIndex !== -1) {
      stack.splice(debugIndex, 1)
      const newWildcardIndex = stack.findIndex(isWildcard)
      stack.splice(newWildcardIndex === -1 ? stack.length : newWildcardIndex, 0, debugMarkupLayer)
    }
  }

  // create a proxy to observe changes to router.stack
  const stackTarget = router.stack
  const stackProxy = new Proxy(router.stack, {
    set (target, property, value) {
      target[property] = value
      moveWildcardRouteToEnd(target)
      indexAllRoutes()
      return true
    },
    deleteProperty (target, property) {
      delete target[property]
      moveWildcardRouteToEnd(target)
      indexAllRoutes()
      return true
    }
  })

  // replace router.stack with the proxy
  router.stack = stackProxy
  // note there is a similar object located at app._router.stack with the app's routes instead of the router's routes that we're not modifying
  //
  // this is because it seems app._router.stack routes take precedence over any routes in router.stack

  // load all controllers
  const controllersPath = path.normalize(app.get('controllersPath'))
  if (fs.pathExistsSync(controllersPath)) {
    try {
      for (const controllerName of await walk(controllersPath)) {
        let controller

        if (controllerName !== params.errorPages.notFound) {
          try {
            if (fs.statSync(controllerName).isFile() && path.extname(controllerName) === '.js') {
              controller = require(controllerName)

              // if the controller accepts less than one or more than two arguments, it's not defining a route
              if (controller.length > 0 && controller.length < 3) {
                await Promise.resolve(controller(router, app))
              }
            }
          } catch (e) {
            logger.error(`${appName} failed to load controller file: ${controllerName}. Please make sure it is coded correctly. See documentation at ${docsUrl}/coding-apps for examples.`)
            logger.error(e)
          }
        }
      }
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}`)
      logger.error(e)
    }
  }

  // the sitemap's routes, after the app's own controllers so that a route of the app's at the same path is served instead
  app.get('sitemap').route(router)

  // the debug markup for the 404 page, for requests no route above took
  //
  // the mode is the app's own rather than NODE_ENV's, which another app in the same process can change
  if (app.get('env') === 'development') {
    const buildDebugMarkup = (req, res, next) => {
      setDebugMarkup(req, res)
      next()
    }
    router.use(buildDebugMarkup)
    debugMarkupLayer = router.stack.find(layer => layer.handle === buildDebugMarkup)
    moveWildcardRouteToEnd(stackTarget)
  }

  // load 404 controller last so that it doesn't supersede the others
  try {
    // do not add default error page if the user defines one
    if (!router.stack.some(layer => layer.route && layer.route.path.startsWith('*'))) require(params.errorPages.notFound)(router, app)
    indexAllRoutes()
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at ${docsUrl}/coding-apps for examples.`)
    logger.error(e)
  }

  // activate the router module
  app.use(prefix || '/', router)

  // custom error page
  app.use((err, req, res, next) => {
    // a response already under way cannot be replaced with an error page, so express is left to cut the connection off instead
    if (res.headersSent) return next(err)

    // an error that is the client's fault, such as a request body too large to accept, is an ordinary occurrence rather than a fault in the app, so it gets a line saying what happened rather than a stack trace
    const status = errorStatus(err)
    if (status < 500) logger.warn(`${status} ${req.method} ${req.originalUrl}: ${err.message}`)
    else logger.error(err.stack)

    setDebugMarkup(req, res, err)
    require(params.errorPages.internalServerError)(app, err, req, res)
  })
}

// the http status an error carries, as err.status or err.statusCode the way express and its body parsers set them, or 500 when it carries no usable one
function errorStatus (err) {
  const status = err?.status ?? err?.statusCode
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}
