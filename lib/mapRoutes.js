require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')

module.exports = app => {
  const express = app.get('express')
  const router = app.get('router')
  const appName = app.get('appName')
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')
  const prefix = params.routePrefix

  // ensure 404 page exists
  params.errorPages.notFound = path.join(app.get('controllersPath'), params.errorPages.notFound)
  if (!fsr.fileExists(params.errorPages.notFound)) {
    params.errorPages.notFound = path.join(__dirname, '../defaultErrorPages/controllers/404')
  }

  // ensure 403 page exists
  params.errorPages.forbidden = path.join(app.get('controllersPath'), params.errorPages.forbidden)
  if (!fsr.fileExists(params.errorPages.forbidden)) {
    params.errorPages.forbidden = path.join(__dirname, '../defaultErrorPages/controllers/403')
  }

  // ensure 500 page exists
  params.errorPages.internalServerError = path.join(app.get('controllersPath'), params.errorPages.internalServerError)
  if (!fsr.fileExists(params.errorPages.internalServerError)) {
    params.errorPages.internalServerError = path.join(__dirname, '../defaultErrorPages/controllers/5xx')
  }

  // ensure 503 page exists
  params.errorPages.serviceUnavailable = path.join(app.get('controllersPath'), params.errorPages.serviceUnavailable)
  if (!fsr.fileExists(params.errorPages.serviceUnavailable)) {
    params.errorPages.serviceUnavailable = path.join(__dirname, '../defaultErrorPages/controllers/503')
  }

  // bind user-defined middleware which fires just before executing the controller if supplied
  if (params.onReqBeforeRoute && typeof params.onReqBeforeRoute === 'function') {
    app.use(params.onReqBeforeRoute)
  }

  // enable multipart
  if (typeof params.formidable === 'object') {
    // TODO: why was app being redefined here?
    require('./enableMultipart.js')(app)
  }

  // bind user-defined middleware which fires after request ends if supplied
  // TODO: investigate if these are being bound correctly or if they will fire multiple times
  if (params.onReqAfterRoute && typeof params.onReqAfterRoute === 'function') {
    app.use((req, res, next) => {
      res.on('finish', function () { params.onReqAfterRoute(req, res) })
      res.on('close', function () { params.onReqAfterRoute(req, res) })
      res.on('error', function () { params.onReqAfterRoute(req, res) })
      next()
    })
  }

  // generate mvc directories
  if (params.makeBuildArtifacts && params.makeBuildArtifacts !== 'staticsOnly') {
    fsr.ensureDirSync(app.get('modelsPath'))
    fsr.ensureDirSync(app.get('viewsPath'))
    fsr.ensureDirSync(app.get('controllersPath'))
  }

  // map statics for developer mode
  if (params.hostPublic || app.get('env') === 'development') {
    app.use(prefix || '/', express.static(app.get('publicFolder')))
  }

  // optional require designed to fail silently allowing || chaining
  router.isoRequire = (module) => {
    try {
      // the paths added by appModulePath in sourceParams aren't automatically available here because of https://github.com/patrick-steele-idem/app-module-path-node/issues/17
      // thus we have to examine each path manually so the shorthands still work in isoRequire the same as they would in require
      let mod
      mod = path.join(params.appDir, module)
      if (fsr.fileExists(mod) || fsr.fileExists(mod + '.js')) {
        return require(path.join(params.appDir, module))
      }
      mod = path.join(path.join(params.appDir, params.modelsPath, '../'), module)
      if (fsr.fileExists(mod) || fsr.fileExists(mod + '.js')) {
        return require(path.join(path.join(params.appDir, params.modelsPath, '../'), module))
      }
      mod = path.join(path.join(params.appDir, params.controllersPath, '../'), module)
      if (fsr.fileExists(mod) || fsr.fileExists(mod + '.js')) {
        return require(path.join(path.join(params.appDir, params.controllersPath, '../'), module))
      }
      if (fsr.fileExists(module)) {
        return require(module)
      }
      return () => {
        logger.error(`isoRequire was unable to load module: ${module}`)
        return {}
      }
    } catch (e) {
      console.error(e)
      return () => {
        logger.error(`isoRequire was unable to load module: ${module}`)
        return {}
      }
    }
  }

  // render JSON instead of HTML when content-type is application/json designed to fail silently allowing || chaining
  router.apiRender = (req, res, model) => {
    if (req.headers && req.headers['content-type'] === 'application/json') {
      res.json(model)
      return true
    } else {
      // fail silently by doing nothing and returning false
      return false
    }
  }

  // convenience method to determine if it's a server-side render
  router.ssr = router.serverSideRender = (req) => {
    if (req.headers && req.headers['content-type'] === 'application/json') {
      return false
    } else {
      return true
    }
  }

  // declare execution context
  router.backend = router.server = true // for auto detection: Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]' // only node.js has a process variable that is of [[Class]] process https://github.com/iliakan/detect-node
  router.frontend = router.client = false

  // build list of controller files
  let controllerFiles
  if (fsr.fileExists(path.normalize(app.get('controllersPath')))) {
    try {
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')))
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}`)
      logger.error(e)
    }

    // load all controllers
    for (let controllerName of controllerFiles) {
      let controller
      controllerName = controllerName.path

      if (controllerName !== params.errorPages.notFound) {
        try {
          if (fs.statSync(controllerName).isFile() && path.extname(controllerName) === '.js') {
            controller = require(controllerName)

            // if the controller accepts less than one or more than two arguments, it's not defining a route
            if (controller.length > 0 && controller.length < 3) {
              controller(router, app)
            }
          }
        } catch (e) {
          logger.error(`${appName} failed to load controller file: ${controllerName}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
          logger.error(e)
        }
      }
    }
  }

  // load 404 controller last so that it doesn't supersede the others
  try {
    require(params.errorPages.notFound)(router, app)

    // define a function to move the 404 controller (the "*" route) to the end
    function moveWildcardRouteToEnd (stack) {
      const wildcardIndex = stack.findIndex(layer => layer.route && layer.route.path === '*')
      if (wildcardIndex !== -1) {
        const [wildcardRoute] = stack.splice(wildcardIndex, 1)
        stack.push(wildcardRoute)
      }
    }

    // create a proxy to observe changes to router.stack
    const stackProxy = new Proxy(router.stack, {
      set (target, property, value) {
        target[property] = value
        moveWildcardRouteToEnd(target)
        return true
      },
      deleteProperty (target, property) {
        delete target[property]
        moveWildcardRouteToEnd(target)
        return true
      }
    })

    // replace router.stack with the proxy
    router.stack = stackProxy

    // note there is a simlar object located at app._router.stack with the app's routes instead of the router's routes that we're not modifying
    // this is because it seems app._router.stack routes take precedence over any routes in router.stack
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
    logger.error(e)
  }

  // activate the router module
  app.use(prefix || '/', router)
}
