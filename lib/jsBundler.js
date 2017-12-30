// js bundler

require('colors')

const browserify = require('browserify')
const path = require('path')

module.exports = function (app, callback) {
  let params = app.get('params')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const jsPath = app.get('jsPath')
  const bundleBuildDir = path.join(app.get('jsCompiledOutput'), (params.bundledJsPath.replace(params.jsPath, '')))
  const logger = require('./tools/logger')(app)
  const fsr = require('./tools/fsr')(app)
  let bundleEnv
  let promises = []

  // make js directory if not present
  if (!fsr.fileExists(jsPath)) {
    if (fsr.ensureDirSync(jsPath)) {
      logger.log('📁', `${appName} making new directory ${jsPath}`.yellow)
    }
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !fsr.fileExists(params.bundledJsPath)) {
    if (fsr.ensureDirSync(params.bundledJsPath)) {
      logger.log('📁', `${appName} making new directory ${path.join(appDir, params.bundledJsPath)}`.yellow)
    }
  }

  // make js bundled output directory in build directory if not present
  if (params.browserifyBundles.length && params.exposeBundles && !fsr.fileExists(bundleBuildDir)) {
    if (fsr.ensureDirSync(bundleBuildDir)) {
      logger.log('📁', `${appName} making new directory ${bundleBuildDir}`.yellow)
    }
  }

  // check if app was launched in dev or prod mode
  if (process.env.NODE_ENV === 'development') {
    bundleEnv = 'dev'
  } else {
    bundleEnv = 'prod'
  }

  params.browserifyBundles.forEach(function (bundle) {
    if (bundle.env === bundleEnv || !bundle.env) {
      promises.push(function (bundle) {
        return new Promise(function (resolve, reject) {
          let i

          for (i in bundle.files) {
            bundle.files[i] = path.join(jsPath, bundle.files[i])
          }

          bundle.params = bundle.params || {}

          if (bundle.params.paths) {
            for (i in bundle.params.paths) {
              bundle.params.paths[i] = path.join(appDir, bundle.params.paths[i])
            }
          } else {
            bundle.params.paths = [
              jsPath
            ]
          }

          browserify(bundle.files, bundle.params).bundle(function (err, jsCode) {
            if (err) {
              logger.error(`${appName} failed to write new JS file ${path.join(appDir, params.bundledJsPath, bundle.outputFile)} due to syntax errors in the source JavaScript\n`.red, err)
              throw err
            } else {
              if (fsr.writeFileSync(path.join(appDir, params.bundledJsPath, bundle.outputFile), jsCode, 'utf8')) {
                logger.log('📝', `${appName} writing new JS file ${path.join(appDir, params.bundledJsPath, bundle.outputFile)}`.green)
              }
              if (params.exposeBundles) {
                if (fsr.writeFileSync(path.join(bundleBuildDir, bundle.outputFile), jsCode, 'utf8')) {
                  logger.log('📝', `${appName} writing new JS file ${path.join(bundleBuildDir, bundle.outputFile)}`.green)
                }
              }
            }
            resolve()
          })
        })
      }(bundle))
    }
  })

  Promise.all(promises).then(function () {
    callback()
  })
}
