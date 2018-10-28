// js bundler

require('colors')

// const browserify = require('browserify')
const path = require('path')

module.exports = {
  // DEPENDENCIES
  fsr: null,
  logger: null,
  path: path,

  // MAIN FUNCTION
  bundle: function (app, callback) {
    const params = app.get('params')
    // const appDir = app.get('appDir')
    const appName = app.get('appName')
    // const jsPath = app.get('jsPath')
    const jsBundledOutput = app.get('jsBundledOutput')
    const bundleBuildDir = this.computeBuildPath(app, path, jsBundledOutput)
    this.logger = require('./tools/logger')(app.get('params').logging)
    this.fsr = require('./tools/fsr')(app)
    // let bundleEnv
    // let promises = []

    if (!this.isBundlerEnabled(params)) {
      callback()
      return
    }

    this.checkOutputDir(this.fsr, this.logger, appName, jsBundledOutput)
    this.checkBuildDir(this.fsr, this.logger, appName, bundleBuildDir, params)

    // bundleEnv = this.isDev(process) ? 'dev' : 'prod'
  },

  // HELPERS
  computeBuildPath: function (app, path, jsBundledOutput) {
    return path.join(app.get('jsCompiledOutput'), jsBundledOutput.replace(app.get('jsPath'), ''))
  },

  isBundlerEnabled: function (params) {
    // checks if bundler is enabled (uses existence of bundles array members)
    return params.js.bundler.bundles.length !== 0
  },

  isDev: function (process) {
    // checks if app was launched in dev or prod mode
    return process.env.NODE_ENV === 'development'
  },

  checkOutputDir: function (fsr, logger, appName, jsBundledOutput) {
    // makes js bundled output directory if not present
    if (!fsr.fileExists(jsBundledOutput)) {
      if (fsr.ensureDirSync(jsBundledOutput)) {
        logger.log('📁', `${appName} making new directory ${jsBundledOutput}`.yellow)
      }
    }
  },

  checkBuildDir: function (fsr, logger, appName, bundleBuildDir, params) {
    // makes js bundled output directory in build directory if not present and expose is true
    if (params.js.bundler.expose && !fsr.fileExists(bundleBuildDir)) {
      if (fsr.ensureDirSync(bundleBuildDir)) {
        logger.log('📁', `${appName} making new directory ${bundleBuildDir}`.yellow)
      }
    }
  }
}

/*
module.exports = function (app, callback) {

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
*/
