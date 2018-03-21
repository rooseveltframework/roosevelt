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
  const logger = require('./tools/logger')(app)
  const fsr = require('./tools/fsr')(app)
  let params = app.get('params')
  let basicCSSPath
  let basicJSPath
  let controllerFiles
  let publicDir
  let ec = 0

  // ensure 404 page exists
  params.error404 = path.join(app.get('controllersPath'), params.error404)
  if (!fsr.fileExists(params.error404)) {
    params.error404 = path.join(__dirname, '../defaultErrorPages/controllers/404.js')
  }

  // ensure 500 page exists
  params.error5xx = path.join(app.get('controllersPath'), params.error5xx)
  if (!fsr.fileExists(params.error5xx)) {
    params.error5xx = path.join(__dirname, '../defaultErrorPages/controllers/5xx.js')
  }

  // ensure 503 page exists
  params.error503 = path.join(app.get('controllersPath'), params.error503)
  if (!fsr.fileExists(params.error503)) {
    params.error503 = path.join(__dirname, '../defaultErrorPages/controllers/503.js')
  }

  // define maximum number of miliseconds to wait for a given request to finish
  toobusy.maxLag(params.toobusy.maxLagPerRequest)

  // define interval in miliseconds to check for event loop lag
  toobusy.interval(params.toobusy.lagCheckInterval)

  // serve 503 page if the process is too busy
  app.use((req, res, next) => {
    if (toobusy()) {
      require(params.error503)(app, req, res)
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

  // if js and/or css compilers are disabled, check that jsPath and cssPath are set to be symlinked
  if (params.css.compiler === 'none' || params.css.compiler === null) {
    basicCSSPath = params.css.sourceDir.replace(params.staticsRoot, '').replace(/^[\\/]+/, '')
    if (!(params.staticsSymlinksToPublic.includes(basicCSSPath))) {
      params.staticsSymlinksToPublic.unshift(basicCSSPath)
    }
  }
  if (params.js.compiler === 'none' || params.js.compiler === null) {
    basicJSPath = params.js.sourceDir.replace(params.staticsRoot, '').replace(/^[\\/]+/, '')
    if (!(params.staticsSymlinksToPublic.includes(basicJSPath))) {
      params.staticsSymlinksToPublic.unshift(basicJSPath)
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
      if (fsr.symlinkSync(staticTarget, linkTarget)) {
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
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')))
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}\n`.red, e)
    }

    // load all controllers
    controllerFiles.forEach((controllerName) => {
      let controller
      controllerName = controllerName.path

      if (controllerName !== params.error404) {
        try {
          if (fs.statSync(controllerName).isFile()) {
            controller = require(controllerName)

            // if the controller accepts more or less than one argument, it's not defining a route
            if (controller.length === 1) {
              controller(app)
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
    require(params.error404)(app)
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.error404}. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.\n`.red, e)
  }

  return app
}
