// js bundler

require('colors')

const browserify = require('browserify')
const path = require('path')

module.exports = {
  // DEPENDENCIES
  fsr: null,
  logger: null,
  path: path,
  browserify: browserify,

  // MAIN FUNCTION
  bundle: function (app, callback) {
    this.params = app.get('params')
    this.appDir = app.get('appDir')
    this.appName = app.get('appName')
    this.jsPath = app.get('jsPath')
    this.jsBundledOutput = app.get('jsBundledOutput')
    this.bundleBuildDir = this.computeBuildPath(app, this.jsBundledOutput)
    this.logger = require('./tools/logger')(app.get('params').logging)
    this.fsr = require('./tools/fsr')(app)
    this.promises = []

    if (!this.isBundlerEnabled(this.params)) {
      callback()
      return
    }

    this.checkOutputDir(this.appName, this.jsBundledOutput)
    this.checkBuildDir(this.appName, this.bundleBuildDir, this.params)

    this.params.js.bundler.bundles.forEach((bundle) => {
      if (this.shouldIncludeBundle(process, bundle)) {
        this.promises.push(this.processBundle(bundle))
      }
    })

    this.conclude(process, this.promises, callback)
  },

  // HELPERS
  computeBuildPath: function (app, jsBundledOutput) {
    return this.path.join(app.get('jsCompiledOutput'), jsBundledOutput.replace(app.get('jsPath'), ''))
  },

  isBundlerEnabled: function (params) {
    // checks if bundler is enabled (uses existence of bundles array members)
    return params.js.bundler.bundles.length !== 0
  },

  checkOutputDir: function (appName, jsBundledOutput) {
    // makes js bundled output directory if not present
    if (!this.fsr.fileExists(jsBundledOutput)) {
      if (this.fsr.ensureDirSync(jsBundledOutput)) {
        this.logger.log('📁', `${appName} making new directory ${jsBundledOutput}`.yellow)
      }
    }
  },

  checkBuildDir: function (appName, bundleBuildDir, params) {
    // makes js bundled output directory in build directory if not present and expose is true
    if (params.js.bundler.expose && !this.fsr.fileExists(bundleBuildDir)) {
      if (this.fsr.ensureDirSync(bundleBuildDir)) {
        this.logger.log('📁', `${appName} making new directory ${bundleBuildDir}`.yellow)
      }
    }
  },

  shouldIncludeBundle (process, bundle) {
    const bundleEnv = process.env.NODE_ENV === 'development' ? 'dev' : 'prod'
    const matchesEnv = bundle.env === bundleEnv
    const hasNoEnv = !bundle.env

    return matchesEnv || hasNoEnv
  },

  processBundle (bundle) {
    return new Promise((resolve, reject) => {
      this.processBundleFiles(bundle)

      this.browserify(bundle.files, bundle.params).bundle((err, jsCode) => {
        this.handleBrowserifyResult(bundle, err, jsCode, resolve, reject)
      })
    })
  },

  processBundleFiles (bundle) {
    let i

    for (i in bundle.files) {
      bundle.files[i] = this.path.join(this.jsPath, bundle.files[i])
    }

    bundle.params = bundle.params || {}

    if (bundle.params.paths) {
      for (i in bundle.params.paths) {
        bundle.params.paths[i] = this.path.join(this.appDir, bundle.params.paths[i])
      }
    } else {
      bundle.params.paths = [
        this.jsPath
      ]
    }
  },

  handleBrowserifyResult (bundle, err, jsCode, resolve, reject) {
    if (err) {
      this.logger.error(
        `${this.appName} failed to write new JS file ${
          path.join(this.jsBundledOutput, bundle.outputFile)
        } due to syntax errors in the source JavaScript`.red
      )
      reject(err)
      return
    } else {
      // write bundled js file to js bundled output
      if (this.fsr.writeFileSync(this.path.join(this.jsBundledOutput, bundle.outputFile), jsCode, 'utf8')) {
        this.logger.log(
          '📝',
          `${this.appName} writing new JS file ${
            this.path.join(this.jsBundledOutput, bundle.outputFile)
          }`.green
        )
      }

      // also write bundled js file to build directory if expose param is true
      if (this.params.js.bundler.expose) {
        if (this.fsr.writeFileSync(this.path.join(this.bundleBuildDir, bundle.outputFile), jsCode, 'utf8')) {
          this.logger.log(
            '📝',
            `${this.appName} writing new JS file ${
              this.path.join(this.bundleBuildDir, bundle.outputFile)
            }`.green
          )
        }
      }
    }
    resolve()
  },

  conclude (process, promises, callback) {
    return Promise.all(promises)
      .then(() => {
        callback()
      })
      .catch((err) => {
        this.logger.error(err)
        process.exit(1)
      })
  }
}
