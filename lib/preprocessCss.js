// css preprocessor

require('colors')

const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')
const prequire = require('parent-require')
const getFunctionArgs = require('./tools/getFunctionArgs')
const CleanCSS = require('clean-css')

module.exports = function (app, callback) {
  const params = app.get('params')
  const appName = app.get('appName')
  const cssPath = app.get('cssPath')
  const cssCompiledOutput = app.get('cssCompiledOutput')
  const usingWhitelist = !!params.css.whitelist
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  let preprocessor
  let cssFiles
  let preprocessorModule
  let preprocessorArgs
  let versionFile
  let versionCode = '/* do not edit; generated automatically by Roosevelt */ '
  let promises = []
  let cssPreprocessor

  // make css directory if not present
  if (!fsr.fileExists(cssPath)) {
    if (fsr.ensureDirSync(cssPath)) {
      logger.info('📁', `${appName} making new directory ${cssPath}`.yellow)
    }
  }

  if (params.css.compiler === 'none' || params.css.compiler === null) {
    callback()
    return
  }

  // Get preprocessor name
  preprocessor = params.css.compiler.nodeModule

  // use user-defined cssCompiler
  if (params.cssCompiler && typeof params.cssCompiler === 'function') {
    cssPreprocessor = params.cssCompiler(app)
  }

  if (cssPreprocessor && typeof cssPreprocessor.versionCode === 'function' && typeof cssPreprocessor.parse === 'function') {
    preprocessorModule = cssPreprocessor
    logger.info('⚙️', `${appName} using your custom CSS preprocessor`.bold)
  } else {
    try {
      // require preprocessor via a dependency
      preprocessorModule = prequire(preprocessor)
    } catch (err) {
      logger.error(`${appName} failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly installed to node_modules.`)
      logger.warn('CSS preprocessor has been disabled')
      params.css.compiler = 'none'
      callback()
      return
    }
  }

  // examine API of preprocessor to ensure compatibility
  if (typeof preprocessorModule.parse === 'function') {
    preprocessorArgs = getFunctionArgs(preprocessorModule.parse)

    if ((preprocessorArgs.length !== 2) || (preprocessorArgs[0] !== 'app') || (preprocessorArgs[1] !== 'fileName')) {
      logger.error(`Selected CSS compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.bold)
      process.exit(1)
    }
  } else {
    logger.error(`Selected CSS compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.bold)
    process.exit(1)
  }

  // make css compiled output directory if not present
  if (!fsr.fileExists(cssCompiledOutput)) {
    if (fsr.ensureDirSync(cssCompiledOutput)) {
      logger.info('📁', `${appName} making new directory ${cssCompiledOutput}`.yellow)
    }
  }

  // check if using whitelist before populating cssFiles
  if (usingWhitelist) {
    if (typeof params.css.whitelist !== 'object') {
      logger.error('CSS whitelist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions')
      callback()
      return
    } else {
      cssFiles = params.css.whitelist
    }
  } else {
    cssFiles = klawSync(cssPath)
  }

  // write versionFile
  if (params.css.versionFile) {
    if (!params.css.versionFile.fileName || typeof params.css.versionFile.fileName !== 'string') {
      logger.error(`${appName} failed to write versioned CSS file! fileName missing or invalid`)
    } else if (!params.css.versionFile.varName || typeof params.css.versionFile.varName !== 'string') {
      logger.error(`${appName} failed to write versioned CSS file! varName missing or invalid'`)
    } else {
      versionFile = path.join(cssPath, params.css.versionFile.fileName)
      versionCode += preprocessorModule.versionCode(app)

      // create it if it does not already exist
      fsr.openSync(versionFile, 'a')

      if (fs.readFileSync(versionFile, 'utf8') !== versionCode) {
        if (fsr.writeFileSync(versionFile, versionCode)) {
          logger.info('📝', `${appName} writing new versioned CSS file to reflect new version ${app.get('appVersion')} to ${versionFile}`.green)
        }
      }
    }
  }

  // clean-css options
  let opts = params.css.compiler.params.cleanCSS || {}

  cssFiles.forEach((file) => {
    file = file.path || file
    promises.push(
      new Promise((resolve, reject) => {
        let split
        let altdest

        // parse whitelist and determine files exist
        if (usingWhitelist) {
          split = file.split(':')
          altdest = split[1]
          file = split[0]

          if (!fsr.fileExists(path.join(cssPath, file))) {
            reject(new Error(`${file} specified in CSS whitelist does not exist. Please ensure file is entered properly.`))
            return
          }
        }

        if (file === '.' || file === '..' || file === 'Thumbs.db' || fs.lstatSync(usingWhitelist ? path.join(cssPath, file) : file).isDirectory()) {
          resolve()
          return
        }

        file = file.replace(cssPath, '')

        preprocessorModule.parse(app, file)
          .then(([newFile, newCSS]) => {
            newFile = path.join(cssCompiledOutput, (altdest || newFile))

            // If minify param is true, do minification using clean-css
            if (params.minify) {
              newCSS = new CleanCSS(opts).minify(newCSS).styles
            }

            // create build directory if it doesn't exist
            if (!fsr.fileExists(path.dirname(newFile))) {
              if (fsr.ensureDirSync(path.dirname(newFile))) {
                logger.info('📁', `${appName} making new directory ${path.dirname(newFile)}`.yellow)
              }
            }

            // create file if it doesn't exist
            fsr.openSync(newFile, 'a')

            // check existing file for matching content before writing
            if (fs.readFileSync(newFile, 'utf8') !== newCSS) {
              if (fsr.writeFileSync(newFile, newCSS)) {
                logger.info('📝', `${appName} writing new CSS file ${newFile}`.green)
              }
              resolve()
            } else {
              resolve()
            }
          })
          .catch((err) => {
            logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly.`)
            reject(err)
          })
      })
    )
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
