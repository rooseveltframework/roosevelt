// js bundler

require('colors')

const browserify = require('browserify')
const path = require('path')

module.exports = function (app, callback) {
  let params = app.get('params')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const jsPath = app.get('jsPath')
  const bundleBuildDir = path.join(app.get('jsCompiledOutput'), (app.get('jsBundledOutput').replace(params.jsPath, '')))
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
  if (params.js.bundler.bundles.length && !fsr.fileExists(params.js.bundler.output)) {
    if (fsr.ensureDirSync(params.js.bundler.output)) {
      logger.log('📁', `${appName} making new directory ${path.join(appDir, params.js.bundler.output)}`.yellow)
    }
  }

  // make js bundled output directory in build directory if not present
  if (params.js.bundler.bundles.length && params.js.bundler.expose && !fsr.fileExists(bundleBuildDir)) {
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

  params.js.bundler.bundles.forEach((bundle) => {
    if (bundle.env === bundleEnv || !bundle.env) {
      promises.push(
        new Promise((resolve, reject) => {
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

          browserify(bundle.files, bundle.params).bundle((err, jsCode) => {
            if (err) {
              logger.error(`${appName} failed to write new JS file ${path.join(appDir, params.js.bundler.output, bundle.outputFile)} due to syntax errors in the source JavaScript`.red)
              reject(err)
            } else {
              if (fsr.writeFileSync(path.join(appDir, params.js.bundler.output, bundle.outputFile), jsCode, 'utf8')) {
                logger.log('📝', `${appName} writing new JS file ${path.join(appDir, params.js.bundler.output, bundle.outputFile)}`.green)
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
      )
    }
  })

  Promise.all(promises)
    .then(() => {
      callback()
    })
    .catch((err) => {
      logger.error(`${err}`.red)
      process.exit(1)
    })
}
