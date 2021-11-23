// map routes

require('colors')

const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const toobusy = require('toobusy-js')

module.exports = app => {
  const express = app.get('express')
  const router = app.get('router')
  const appName = app.get('appName')
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')
  const prefix = params.routePrefix
  let controllerFiles

  // ensure 404 page exists
  params.errorPages.notFound = path.join(app.get('controllersPath'), params.errorPages.notFound)
  if (!fsr.fileExists(params.errorPages.notFound)) {
    params.errorPages.notFound = path.join(__dirname, '../defaultErrorPages/controllers/404')
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

  // add route to allow disabling validator in dev mode
  if (app.get('env') === 'development') {
    require('../defaultErrorPages/controllers/disableValidator')(app)
  }

  // define maximum number of miliseconds to wait for a given request to finish
  toobusy.maxLag(params.toobusy.maxLagPerRequest)

  // define interval in miliseconds to check for event loop lag
  toobusy.interval(params.toobusy.lagCheckInterval)

  // serve 503 page if the process is too busy
  app.use((req, res, next) => {
    if (toobusy()) {
      require(params.errorPages.serviceUnavailable)(app, req, res)
    } else {
      next()
    }
  })

  // bind user-defined middleware which fires just before executing the controller if supplied
  if (params.onReqBeforeRoute && typeof params.onReqBeforeRoute === 'function') {
    app.use(params.onReqBeforeRoute)
  }

  // enable multipart
  if (typeof params.formidable === 'object') {
    app = require('./enableMultipart.js')(app)
  }

  // bind user-defined middleware which fires after request ends if supplied
  if (params.onReqAfterRoute && typeof params.onReqAfterRoute === 'function') {
    app.use((req, res, next) => {
      res.on('finish', function () { params.onReqAfterRoute(req, res) })
      res.on('close', function () { params.onReqAfterRoute(req, res) })
      res.on('error', function () { params.onReqAfterRoute(req, res) })
      next()
    })
  }

  // generate mvc directories
  fsr.ensureDirSync(app.get('modelsPath'))
  fsr.ensureDirSync(app.get('viewsPath'))
  fsr.ensureDirSync(app.get('controllersPath'))

  // map statics for developer mode
  if (params.hostPublic || app.get('env') === 'development') {
    app.use(prefix || '/', express.static(app.get('publicFolder')))
  }

  // optional require designed to fail silently allowing || chaining
  router.isoRequire = (module) => {
    try {
      return require(module)
    } catch (e) {
      // fail silently by returning a function that does nothing but return false
      return () => {
        return false
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
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
    logger.error(e)
  }

  // activate the router module
  app.use(prefix || '/', router)

  return app
}
