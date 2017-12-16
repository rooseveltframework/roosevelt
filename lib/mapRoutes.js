// map routes

require('colors')

const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')
const toobusy = require('toobusy-js')
const fileExists = require('./fileExists')
const symlinkExists = require('./symlinkExists')

module.exports = function (app) {
  const express = app.get('express')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const logger = require('./logger')(app)
  const fsr = require('./tools/fsr')(app)
  let params = app.get('params')
  let basicCSSPath
  let basicJSPath
  let controllerFiles
  let publicDir
  let ec = 0

  // define maximum number of miliseconds to wait for a given request to finish
  toobusy.maxLag(params.maxLagPerRequest)

  // serve 503 page if the process is too busy
  app.use(function (req, res, next) {
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
    app.use(function (req, res, next) {
      let afterEnd = function () {
        params.onReqAfterRoute(req, res)
      }
      res.once('finish', afterEnd)
      res.once('close', afterEnd)
      res.once('error', afterEnd)
      next()
    })
  }

  // get public folder up and running
  publicDir = path.join(appDir, params.publicFolder)

  // make public folder itself if it doesn't exist
  if (!fileExists(publicDir)) {
    if (fsr.ensureDirSync(publicDir)) {
      logger.log('📁', `${appName} making new directory ${publicDir}`.yellow)
    }
  }

  // make statics prefix folder if the setting is enabled
  if (params.staticsPrefix) {
    publicDir = path.join(publicDir, params.staticsPrefix)
    if (!fileExists(publicDir)) {
      if (fsr.ensureDirSync(publicDir)) {
        logger.log('📁', `${appName} making new directory ${publicDir}`.yellow)
      }
    }
  }

  // if js and/or css compilers are disabled, check that jsPath and cssPath are set to be symlinked
  if (params.cssCompiler === 'none' || params.cssCompiler === null) {
    basicCSSPath = params.cssPath.replace(params.staticsRoot, '')
    if (basicCSSPath.charAt(0) === path.sep) {
      basicCSSPath = basicCSSPath.substr(1)
    }
    if (!(basicCSSPath in params.symlinksToStatics)) {
      logger.warn('Adding CSS directory to symlinksToStatics list'.yellow)
      params.symlinksToStatics.unshift(basicCSSPath)
    }
  }
  if (params.jsCompiler === 'none' || params.jsCompiler === null) {
    basicJSPath = params.jsPath.replace(params.staticsRoot, '')
    if (basicJSPath.charAt(0) === path.sep) {
      basicJSPath = basicJSPath.substr(1)
    }
    if (!(basicJSPath in params.symlinksToStatics)) {
      logger.warn('Adding JS directory to symlinksToStatics list'.yellow)
      params.symlinksToStatics.unshift(basicJSPath)
    }
  }

  // make symlinks to public statics
  params.symlinksToStatics.forEach(function (pubStatic) {
    pubStatic = pubStatic.split(':')
    let staticTarget = path.join(appDir, params.staticsRoot, (pubStatic[1] || pubStatic[0]).trim())
    let linkTarget = path.join(publicDir, pubStatic[0].trim())

    // make static target folder if it hasn't yet been created
    if (!fileExists(staticTarget)) {
      if (fsr.ensureDirSync(staticTarget)) {
        logger.log('📁', `${appName} making new directory ${staticTarget}`.yellow)
      }
    }

    // make symlink if it doesn't yet exist
    if (!fileExists(linkTarget)) {
      if (symlinkExists(linkTarget)) {
        fs.unlinkSync(linkTarget)
      }
      if (fsr.symlinkSync(staticTarget, linkTarget)) {
        logger.log('📁', `${appName} making new symlink `.cyan + `${linkTarget}`.yellow + (' pointing to ').cyan + `${staticTarget}`.yellow)
      }
    }
  })

  // make MVC folders if they don't exist
  if (!fileExists(app.get('modelsPath'))) {
    if (fsr.ensureDirSync(app.get('modelsPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('modelsPath')}`.yellow)
    }
  }
  if (!fileExists(app.get('viewsPath'))) {
    if (fsr.ensureDirSync(app.get('viewsPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('viewsPath')}`.yellow)
    }
  }
  if (!fileExists(app.get('controllersPath'))) {
    if (fsr.ensureDirSync(app.get('controllersPath'))) {
      logger.log('📁', `${appName} making new directory ${app.get('controllersPath')}`.yellow)
    }
  }

  // map statics for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    app.use('/', express.static(app.get('publicFolder')))
  }

  // build list of controller files
  if (fileExists(path.normalize(app.get('controllersPath')))) {
    try {
      controllerFiles = klawSync(path.normalize(app.get('controllersPath')))
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}\n`.red, e)
    }

    // load all controllers
    controllerFiles.forEach(function (controllerName) {
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
