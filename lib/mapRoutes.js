// map routes

require('colors')

const fs = require('fs')
const path = require('path')
const util = require('util')
const klawSync = require('klaw-sync')
const toobusy = require('toobusy-js')

module.exports = function (app) {
  const express = app.get('express')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const logger = require('./tools/logger')(app.get('params').logging)
  const fsr = require('./tools/fsr')(app)
  let params = app.get('params')
  let controllerFiles
  let publicDir
  let ec = 0

  // ensure 404 page exists
  params.errorPages.notFound = path.join(app.get('controllersPath'), params.errorPages.notFound)
  if (!fsr.fileExists(params.errorPages.notFound)) {
    params.errorPages.notFound = path.join(__dirname, '../defaultErrorPages/controllers/404.js')
  }

  // ensure 500 page exists
  params.errorPages.internalServerError = path.join(app.get('controllersPath'), params.errorPages.internalServerError)
  if (!fsr.fileExists(params.errorPages.internalServerError)) {
    params.errorPages.internalServerError = path.join(__dirname, '../defaultErrorPages/controllers/5xx.js')
  }

  // ensure 503 page exists
  params.errorPages.serviceUnavailable = path.join(app.get('controllersPath'), params.errorPages.serviceUnavailable)
  if (!fsr.fileExists(params.errorPages.serviceUnavailable)) {
    params.errorPages.serviceUnavailable = path.join(__dirname, '../defaultErrorPages/controllers/503.js')
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
  if (typeof params.multipart === 'object') {
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

  // get public folder up and running
  publicDir = path.join(appDir, params.publicFolder)

  // make public folder itself if it doesn't exist
  if (!fsr.fileExists(publicDir)) {
    if (fsr.ensureDirSync(publicDir)) {
      logger.log('📁', `${appName} making new directory ${publicDir}`.yellow)
    }
  }

  // make statics prefix folder if the setting is enabled
  if (params.staticsPrefix) {
    publicDir = path.join(publicDir, params.staticsPrefix)
    if (!fsr.fileExists(publicDir)) {
      if (fsr.ensureDirSync(publicDir)) {
        logger.log('📁', `${appName} making new directory ${publicDir}`.yellow)
      }
    }
  }

  // make symlinks to public statics
  params.staticsSymlinksToPublic.forEach((pubStatic) => {
    pubStatic = pubStatic.split(':')
    let staticTarget = path.join(appDir, params.staticsRoot, (pubStatic[1] || pubStatic[0]).trim())
    let linkTarget = path.join(publicDir, pubStatic[0].trim())

    // make static target folder if it hasn't yet been created
    if (!fsr.fileExists(staticTarget)) {
      if (fsr.ensureDirSync(staticTarget)) {
        logger.log('📁', `${appName} making new directory ${staticTarget}`.yellow)
      }
    }

    // make symlink if it doesn't yet exist
    if (!fsr.fileExists(linkTarget)) {
      if (fsr.symlinkSync(staticTarget, linkTarget, 'junction')) {
        logger.log('📁', `${appName} making new symlink `.cyan + `${linkTarget}`.yellow + (' pointing to ').cyan + `${staticTarget}`.yellow)
      }
    }
  })

  // make MVC folders if they don't exist
  if (!fsr.fileExists(app.get('modelsPath'))) {
    if (fsr.ensureDirSync(app.get('modelsPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('modelsPath')}`.yellow)
    }
  }
  if (!fsr.fileExists(app.get('viewsPath'))) {
    if (fsr.ensureDirSync(app.get('viewsPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('viewsPath')}`.yellow)
    }
  }
  if (!fsr.fileExists(app.get('controllersPath'))) {
    if (fsr.ensureDirSync(app.get('controllersPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('controllersPath')}`.yellow)
    }
  }

  // map statics for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    app.use('/', express.static(app.get('publicFolder')))
  }

  // build list of controller files
  if (fsr.fileExists(path.normalize(app.get('controllersPath')))) {
    try {
      // get controller files
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')), { 'nodir': true })
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}\n`.red, e)
    }

    let controllerPath
    let newRouter
    let prefix
    let requiredController
    // Set up custom routers
    if (Array.isArray(params.routers)) {
      // loop routers
      params.routers.forEach(router => {
        prefix = validatePrefix(router.prefix)
        if (typeof prefix === 'string' && Array.isArray(router.controllers)) {
          // removes duplicates from the controllers array if there are any
          let controllers = [...new Set(router.controllers)]
          // loop controllers within a router
          controllers.forEach((controller, index) => {
            // if it's the first index of the array create a new router
            if (index === 0) {
              newRouter = app.get('express').Router()
            }
            if (typeof controller === 'string') {
              controllerPath = path.join(app.get('controllersPath'), controller)
              if (fs.existsSync(controllerPath)) {
                if (path.extname(controllerPath) === '.js') {
                  // if the path extension is ".js" then require it and pass the router to it
                  requiredController = require(controllerPath)
                  // make sure the controller accepts at least 1 arg
                  if (requiredController.length >= 1) {
                    requiredController(newRouter, app)
                  }
                  // remove the controller from controllerFiles
                  for (let x = controllerFiles.length - 1; x >= 0; x--) {
                    if (controllerFiles[x].path.includes(controllerPath)) {
                      controllerFiles.splice(x, 1)
                    }
                  }
                } else if (path.extname(controllerPath) === '') {
                  // if the path is a dir then we must get all files inside of that dir and handle them individually
                  for (let x = controllerFiles.length - 1; x >= 0; x--) {
                    if (controllerFiles[x].path.includes(controllerPath)) {
                      requiredController = require(controllerFiles[x].path)
                      // make sure the controller accepts at least 1 arg
                      if (requiredController.length >= 1) {
                        requiredController(newRouter, app)
                      }
                      // remove the controller from controllerFiles
                      controllerFiles.splice(x, 1)
                    }
                  }
                }
                // on the last iteration have app digest the router
                if (index === controllers.length - 1) {
                  app.use(prefix, newRouter)
                }
              } else {
                logger.warn(`${appName} failed to load the ${path.extname(controller) === '.js' ? 'controller' : 'directory'}: "${controller}" to use with the router associated with prefix: ${prefix}`.yellow)
              }
            } else {
              logger.warn(`"${controller}" must be type string but found type ${typeof controller}`.yellow)
            }
          })
        } else {
          logger.warn(`${appName} found an invalid configuration in the router: ${util.inspect(router)}`.yellow)
        }
      })
    }

    // use the default app router for the files within controllerFiles
    controllerFiles.forEach((controllerName) => {
      let controller
      controllerName = controllerName.path

      if (controllerName !== params.errorPages.notFound) {
        try {
          if (fs.statSync(controllerName).isFile() && path.extname(controllerName) === '.js') {
            controller = require(controllerName)

            // if the controller accepts more or less than one argument, it's not defining a route
            if (controller.length === 1) {
              // setup controller routes
              controller(app, app)
            }
          }
        } catch (e) {
          if (!ec) {
            logger.error('🔥', 'The night is dark and full of errors!'.red.bold)
            ec++
          }
          logger.error(`${appName} failed to load controller file: ${controllerName}. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.\n`.red, e)
        }
      }
    })
  }

  // load 404 controller last so that it doesn't supersede the others
  try {
    require(params.errorPages.notFound)(app)
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.\n`.red, e)
  }

  return app
}

function validatePrefix (urlPrefix) {
  if (typeof urlPrefix === 'string') {
    // remove whitespace
    urlPrefix = urlPrefix.replace(/\s/g, '')
    // test for valid urlPrefix
    if (/^[a-zA-Z0-9/_-]*$/.test(urlPrefix)) {
      if (urlPrefix.charAt(0) !== '/') {
        urlPrefix = [urlPrefix.slice(0, 0), '/', urlPrefix.slice(0)].join('')
      }
      return urlPrefix
    } else {
      return false
    }
  } else {
    return false
  }
}
