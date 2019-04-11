// js bundler

require('colors')

const browserify = require('browserify')
const path = require('path')

module.exports = function (app, callback) {
  const params = app.get('params')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const jsPath = app.get('jsPath')
  const jsBundledOutput = app.get('jsBundledOutput')
  const bundleBuildDir = path.join(app.get('jsCompiledOutput'), jsBundledOutput.replace(app.get('jsPath'), ''))
  const logger = app.get('logger')(app.get('params').logging)
  const fsr = require('./tools/fsr')(app)
  let bundleEnv
  let promises = []

  // use existence of bundles array members to determine if bundler is enabled
  if (!params.js.bundler.bundles.length) {
    callback()
    return
  }

  // make js bundled output directory if not present
  if (!fsr.fileExists(jsBundledOutput)) {
    if (fsr.ensureDirSync(jsBundledOutput)) {
      logger.log('📁', `${appName} making new directory ${jsBundledOutput}`.yellow)
    }
  }

  // make js bundled output directory in build directory if not present and expose is true
  if (params.js.bundler.expose && !fsr.fileExists(bundleBuildDir)) {
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

  // process bundles
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
              logger.error(`${appName} failed to write new JS file ${path.join(jsBundledOutput, bundle.outputFile)} due to syntax errors in the source JavaScript`.red)
              reject(err)
              return
            } else {
              // write bundled js file to js bundled output
              if (fsr.writeFileSync(path.join(jsBundledOutput, bundle.outputFile), jsCode, 'utf8')) {
                logger.log('📝', `${appName} writing new JS file ${path.join(jsBundledOutput, bundle.outputFile)}`.green)
              }

              // also write bundled js file to build directory if expose param is true
              if (params.js.bundler.expose) {
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
      logger.error(err)
      process.exit(1)
    })
}
