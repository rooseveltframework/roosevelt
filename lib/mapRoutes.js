// map routes

require('colors')

const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')
const toobusy = require('toobusy-js')

module.exports = function (app) {
  const express = app.get('express')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const logger = require('./tools/logger')(app.get('params').logging)
  const fsr = require('./tools/fsr')(app)
  let params = app.get('params')
  let routers = params.routers
  let controllerFiles
  let publicDirs
  let schemaLocation
  let publicDir

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

  // function to validate router parameters passed in
  let checkRouters = function (customRouters, directory) {
    let errorBool = false
    customRouters = customRouters.filter(router => {
      if (Object.keys(router).length === 0 && router.constructor === Object) {
        return false
      } else if (typeof router !== 'object' || typeof router.prefix !== 'string' || !/^[a-zA-Z0-9/_-]*$/.test(router.prefix) || !Array.isArray(router.files) || router.files.length === 0) {
        errorBool = true
        return false
      } else {
        return true
      }
    }).map(router => {
      router.prefix = router.prefix.charAt(0) !== '/' ? [router.prefix.slice(0, 0), '/', router.prefix.slice(0)].join('') : router.prefix
      router.files = router.files.filter(file => {
        if (typeof file !== 'string') {
          errorBool = true
          return false
        }
        if (!fs.existsSync(path.join(app.get(directory === 'controllers' ? 'controllersPath' : 'publicFolder'), file))) {
          logger.warn(`${app.get('appName')} failed to load the ${path.extname(file) === '.js' ? 'file' : 'directory'}: "${file}" to use with the router associated with ${directory === 'controllers' ? 'controller' : 'static'} prefix: ${router.prefix}`.yellow)
          return false
        }
        return true
      })
      return router
    })
    if (errorBool) {
      logger.warn(`Invalid configuration found in the "routers.${directory}" parameter. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`.yellow)
    }
    return customRouters
  }

  // validate routers parameter
  if (Object.keys(routers).length > 0 && routers.constructor === Object) {
    // check for a controllers schema
    if (typeof routers.controllers === 'string') {
      if (fs.existsSync(path.join(app.get('controllersPath'), routers.controllers))) {
        schemaLocation = path.join(app.get('controllersPath'), routers.controllers)
        routers.controllers = require(schemaLocation)
      } else {
        logger.warn(`Failed to load file: "${routers.controllers}". All controllers will be routed through the app level router.`.yellow)
        routers.controllers = false
      }
    }
    // validate supplied routing params
    routers.controllers = Array.isArray(routers.controllers) ? checkRouters(routers.controllers, 'controllers') : false
    routers.statics = Array.isArray(routers.statics) ? checkRouters(routers.statics, 'statics') : false
  } else {
    routers = false
  }

  // map statics for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    // build list of public files
    if (fsr.fileExists(path.normalize(app.get('publicFolder')))) {
      // get newly created public files
      publicDirs = klawSync(path.normalize(app.get('publicFolder')), { 'nofile': true })
      publicDirs = publicDirs.map(controller => controller.path)
      if (publicDirs) {
        let staticAssigned
        let staticDirs
        if (routers.statics) {
          publicDirs.forEach(publicDir => {
            staticAssigned = false
            if (routers.statics) {
              routers.statics.forEach(statics => {
                // remove duplicates from static files
                staticDirs = [...new Set(statics.files)]
                staticDirs.forEach(staticDir => {
                  if (publicDir.includes(path.join(app.get('publicFolder'), staticDir))) {
                    app.use(path.join(statics.prefix, staticDir).replace(/\\/g, '/'), express.static(publicDir))
                    staticAssigned = true
                  }
                })
              })
            }
            // static wasn't assigned to a route so assign it to "/" + diriectory name
            if (!staticAssigned) {
              app.use(publicDir.split(app.get('publicFolder'))[1].replace(/\\/g, '/'), express.static(publicDir))
            }
          })
        } else {
          app.use('/', express.static(app.get('publicFolder')))
        }
      }
    }
  }

  // build list of controller files
  if (fsr.fileExists(path.normalize(app.get('controllersPath')))) {
    try {
      // get controller files
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')), { 'nodir': true })
      controllerFiles = controllerFiles.map(controller => controller.path)

      // if a schema was supplied then splice that from the controller files
      if (schemaLocation) {
        controllerFiles.splice(controllerFiles.indexOf(schemaLocation), 1)
      }
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}\n`.red, e)
    }

    // assign controllers to routers
    if (controllerFiles) {
      let controllerAssigned
      let requiredController
      let routerControllers
      let ec = 0
      let mainRouter = app.get('express').Router()
      controllerFiles.forEach(controller => {
        controllerAssigned = false
        if (controller !== app.get('params').errorPages.notFound) {
          // require controller file
          try {
            if (fs.statSync(controller).isFile() && path.extname(controller) === '.js') {
              requiredController = require(controller)
            }

            // check to see if that controller belongs to a custom router
            if (routers.controllers) {
              routers.controllers.forEach((router, routerIndex) => {
                // remove duplicates from controllers
                routerControllers = [...new Set(router.files)]
                if (!routers.controllers[routerIndex].router) routers.controllers[routerIndex].router = app.get('express').Router()
                routerControllers.forEach(routerController => {
                  if (controller.includes(path.join(app.get('controllersPath'), routerController))) {
                    // if the controller accepts less than one or more than two arguments, it's not defining a route
                    if (requiredController.length > 0 && requiredController.length < 3 && typeof requiredController === 'function') {
                      requiredController(routers.controllers[routerIndex].router, app)
                      controllerAssigned = true
                    }
                  }
                })
              })
            }
            // controller wasn't used so pass it to the main app router
            if (!controllerAssigned) {
              // if the controller accepts less than one or more than two arguments, it's not defining a route
              if (requiredController.length > 0 && requiredController.length < 3 && typeof requiredController === 'function') {
                requiredController(mainRouter, app)
              }
            }
          } catch (e) {
            if (!ec) {
              logger.error('🔥', 'The night is dark and full of errors!'.red.bold)
              ec++
            }
            logger.error(`${appName} failed to load controller file: ${controller}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.\n`.red, e)
          }
        }
      })

      // have app consume the custom routers
      if (routers.controllers) {
        routers.controllers.forEach(router => {
          if (router.router) {
            app.use(router.prefix, router.router)
          }
        })
      }

      // load 404 controller last so that it doesn't supersede the others
      try {
        require(params.errorPages.notFound)(mainRouter, app)
      } catch (e) {
        logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.\n`.red, e)
      }

      // have app consume the main router
      app.use('/', mainRouter)
    }
  }

  return app
}
