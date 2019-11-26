// map routes

require('colors')

const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const toobusy = require('toobusy-js')

module.exports = function (app) {
  const express = app.get('express')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')
  let routers = params.routers
  let controllerFiles
  let publicFolderDirs
  let schemaLocation
  let publicDir
  const symDirs = []

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
      logger.info('📁', `${appName} making new directory ${publicDir}`.yellow)
    }
  }

  // make statics prefix folder if the setting is enabled
  if (params.staticsPrefix) {
    publicDir = path.join(publicDir, params.staticsPrefix)
    if (!fsr.fileExists(publicDir)) {
      if (fsr.ensureDirSync(publicDir)) {
        logger.info('📁', `${appName} making new directory ${publicDir}`.yellow)
      }
    }
  }

  // make symlinks to public statics
  params.staticsSymlinksToPublic.forEach((pubStatic) => {
    pubStatic = pubStatic.split(':')
    const staticTarget = path.join(appDir, params.staticsRoot, (pubStatic[1] || pubStatic[0]).trim())
    const linkTarget = path.join(publicDir, pubStatic[0].trim())

    // make static target folder if it hasn't yet been created
    if (!fsr.fileExists(staticTarget)) {
      if (fsr.ensureDirSync(staticTarget)) {
        logger.info('📁', `${appName} making new directory ${staticTarget}`.yellow)
      }
    }

    // make symlink if it doesn't yet exist
    if (!fsr.fileExists(linkTarget)) {
      // check if the new symlink is in a subdirectory of a previous symlink
      const areSubDirs = symDirs.map(symDir => !path.relative(symDir, linkTarget).startsWith('..'))
      if (!areSubDirs.includes(true) && fsr.symlinkSync(staticTarget, linkTarget, 'junction')) {
        symDirs.push(linkTarget)
        logger.info('📁', `${appName} making new symlink `.cyan + `${linkTarget}`.yellow + (' pointing to ').cyan + `${staticTarget}`.yellow)
      } else {
        const parentSymDir = symDirs[areSubDirs.indexOf(true)]
        logger.error(`Symlink failed! Cannot make ${linkTarget} a symlink as a subdirectory of ${parentSymDir}.`)
      }
    }
  })

  // make MVC folders if they don't exist
  if (!fsr.fileExists(app.get('modelsPath'))) {
    if (fsr.ensureDirSync(app.get('modelsPath'))) {
      logger.info('📁', `${appName} making new directory ${app.get('modelsPath')}`.yellow)
    }
  }
  if (!fsr.fileExists(app.get('viewsPath'))) {
    if (fsr.ensureDirSync(app.get('viewsPath'))) {
      logger.info('📁', `${appName} making new directory ${app.get('viewsPath')}`.yellow)
    }
  }
  if (!fsr.fileExists(app.get('controllersPath'))) {
    if (fsr.ensureDirSync(app.get('controllersPath'))) {
      logger.info('📁', `${appName} making new directory ${app.get('controllersPath')}`.yellow)
    }
  }

  // function to validate router parameters passed in
  const checkRouters = function (customRouters, directory) {
    let errorBool = false
    const filesOrDirs = directory === 'controllers' ? 'files' : 'dirs'
    customRouters = customRouters.filter(router => {
      if (Object.keys(router).length === 0 && router.constructor === Object) {
        return false
      } else if (typeof router !== 'object' || typeof router.prefix !== 'string' || !/^[a-zA-Z0-9/_-]*$/.test(router.prefix) || !Array.isArray(router[filesOrDirs]) || router[filesOrDirs].length === 0) {
        errorBool = true
        return false
      } else {
        return true
      }
    }).map(router => {
      router.prefix = router.prefix.charAt(0) !== '/' ? [router.prefix.slice(0, 0), '/', router.prefix.slice(0)].join('') : router.prefix
      router[filesOrDirs] = router[filesOrDirs].filter(file => {
        if (typeof file !== 'string') {
          errorBool = true
          return false
        }
        if (!fs.existsSync(path.join(app.get(directory === 'controllers' ? 'controllersPath' : 'publicFolder'), file))) {
          logger.warn(`${app.get('appName')} failed to load the ${path.extname(file) === '.js' ? 'file' : 'directory'}: "${file}" to use with the router associated with ${directory === 'controllers' ? 'controller' : 'public'} prefix: ${router.prefix}`)
          return false
        }
        return true
      })
      return router
    })
    if (errorBool) {
      logger.warn(`Invalid configuration found in the "routers.${directory}" parameter. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
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
        logger.warn(`Failed to load file: "${routers.controllers}". All controllers will be routed through the app level router.`)
        routers.controllers = false
      }
    }
    // validate supplied routing params
    routers.controllers = Array.isArray(routers.controllers) ? checkRouters(routers.controllers, 'controllers') : false
    routers.public = Array.isArray(routers.public) ? checkRouters(routers.public, 'public') : false
  } else {
    routers = false
  }

  // map public files for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    // build list of public files
    if (fsr.fileExists(path.normalize(app.get('publicFolder')))) {
      // get newly created public symlinks
      publicFolderDirs = klawSync(path.normalize(app.get('publicFolder')), { nofile: true })
      publicFolderDirs = publicFolderDirs.map(publicDir => publicDir.path)
      if (publicFolderDirs) {
        let publicAssigned
        let publicDirs
        if (routers.public) {
          publicFolderDirs.forEach(publicDir => {
            publicAssigned = false
            if (routers.public) {
              routers.public.forEach(publicConfig => {
                // remove duplicates from public dirs
                publicDirs = [...new Set(publicConfig.dirs)]
                publicDirs.forEach(definedPublicDir => {
                  if (publicDir.includes(path.join(app.get('publicFolder'), definedPublicDir))) {
                    app.use(path.join(publicConfig.prefix, definedPublicDir).replace(/\\/g, '/'), express.static(publicDir))
                    publicAssigned = true
                  }
                })
              })
            }
            // public wasn't assigned to a route so assign it to "/" + diriectory name
            if (!publicAssigned) {
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
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')), { nodir: true })
      controllerFiles = controllerFiles.map(controller => controller.path)

      // if a schema was supplied then splice that from the controller files
      if (schemaLocation) {
        controllerFiles.splice(controllerFiles.indexOf(schemaLocation), 1)
      }
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}\n`, e)
    }

    // assign controllers to routers
    if (controllerFiles) {
      let controllerAssigned
      let requiredController
      let routerControllers
      const mainRouter = app.get('express').Router()
      controllerFiles.forEach(controller => {
        controllerAssigned = false
        if (controller !== app.get('params').errorPages.notFound) {
          // require controller file
          const exceptions = ['.DS_Store'] // do not attempt to execute controller logic on these files
          if (exceptions.indexOf(path.basename(controller)) < 0) {
            try {
              requiredController = null
              if (fs.statSync(controller).isFile() && path.extname(controller) === '.js') {
                requiredController = require(controller)
              } else {
                return
              }

              // check to see if that controller belongs to a custom router
              if (routers.controllers) {
                routers.controllers.forEach((router, routerIndex) => {
                  // remove duplicates from controllers
                  routerControllers = [...new Set(router.files)]
                  if (!routers.controllers[routerIndex].router) {
                    routers.controllers[routerIndex].router = app.get('express').Router()
                    // router level middleware to override res.redirect()
                    routers.controllers[routerIndex].router.use((req, res, next) => {
                      const redirect = res.redirect
                      // overwrite the res.redirect() function
                      res.redirect = function () {
                        let address
                        let override
                        let status

                        // remove any trailing slashes for proper concatenation
                        const prefix = router.prefix.replace(/\/+$/, '')

                        // logic to preserve allowable express arguments
                        if (arguments.length === 1 && typeof arguments[0] === 'string') {
                          address = arguments[0]
                        } else if (arguments.length === 2 && typeof arguments[0] === 'number' && typeof arguments[1] === 'string') {
                          status = arguments[0]
                          address = arguments[1]
                        } else if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
                          address = arguments[0]
                          override = arguments[1]
                        } else if (arguments.length === 3 && typeof arguments[0] === 'number' && typeof arguments[1] === 'string' && typeof arguments[2] === 'boolean') {
                          status = arguments[0]
                          address = arguments[1]
                          override = arguments[2]
                        } else {
                          // invalid arguments passed to res.redirect(), set address to 'back' so the application doesn't break
                          logger.error('Invalid arguments supplied to res.redirect()')
                          address = 'back'
                        }

                        if (!override && address.charAt(0) === '/') {
                          address = prefix + address
                        }

                        if (status) {
                          redirect.call(this, status, address)
                        } else {
                          redirect.call(this, address)
                        }
                      }
                      next()
                    })
                  }
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
              logger.error(`${appName} failed to load controller file: ${controller}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.\n`, e)
            }
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
        logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.\n`, e)
      }

      // have app consume the main router
      app.use('/', mainRouter)
    }
  }

  return app
}
