// js compiler

require('colors')

const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')
const prequire = require('parent-require')
const getFunctionArgs = require('./tools/getFunctionArgs')
const gitignoreScanner = require('./tools/gitignoreScanner')

module.exports = function (app, callback) {
  const params = app.get('params')
  const appName = app.get('appName')
  const jsPath = app.get('jsPath')
  const jsCompiledOutput = app.get('jsCompiledOutput')
  const usingWhitelist = !!params.js.whitelist
  const blacklist = params.js.blacklist || []
  const logger = require('./tools/logger')(app.get('params').logging)
  const fsr = require('./tools/fsr')(app)
  let preprocessor
  let gitignoreFiles = []
  let jsFiles
  let preprocessorModule
  let preprocessorArgs
  let promises = []
  let jsCompiler

  // make js directory if not present
  if (!fsr.fileExists(jsPath)) {
    if (fsr.ensureDirSync(jsPath)) {
      logger.log('📁', `${appName} making new directory ${jsPath}`.yellow)
    }
  }

  if (params.js.compiler === 'none' || params.js.compiler === null) {
    callback()
    return
  }

  if (params.minify) {
    // Get preprocessor name
    preprocessor = params.js.compiler.nodeModule

    // use user-defined jsCompiler
    if (params.jsCompiler && typeof params.jsCompiler === 'function') {
      jsCompiler = params.jsCompiler(app)
    }

    if (jsCompiler && typeof jsCompiler.parse === 'function') {
      preprocessorModule = jsCompiler.parse
      logger.log('⚙️', `${appName} using your custom JS preprocessor`.bold)
    } else {
      try {
        // require preprocessor via a dependency
        preprocessorModule = prequire(preprocessor)
      } catch (err) {
        logger.error(`${appName} failed to include your JS compiler! Please ensure that it is declared properly in your package.json and that it has been properly installed to node_modules.`.red)
        logger.error(err)
        logger.warn('JS compiler has been disabled'.yellow)
        params.js.compiler = 'none'
        callback()
        return
      }
    }

    // examine API of preprocessor to ensure compatibility
    if (typeof preprocessorModule.parse === 'function') {
      preprocessorArgs = getFunctionArgs(preprocessorModule.parse)

      if ((preprocessorArgs.length !== 2) || (preprocessorArgs[0] !== 'app') || (preprocessorArgs[1] !== 'fileName')) {
        logger.error(`Selected JS compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
        process.exit(1)
      }
    } else {
      logger.error(`Selected JS compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
      process.exit(1)
    }
  }

  // make js compiled output directory if not present
  if (!fsr.fileExists(jsCompiledOutput)) {
    if (fsr.ensureDirSync(jsCompiledOutput)) {
      logger.log('📁', `${appName} making new directory ${jsCompiledOutput}`.yellow)
    }
  }

  // check if using whitelist before populating jsFiles
  if (usingWhitelist) {
    if (typeof params.js.whitelist !== 'object') {
      logger.error('JS whitelist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions'.red)
      callback()
      return
    } else {
      jsFiles = params.js.whitelist
    }
  } else {
    jsFiles = klawSync(jsPath)
  }

  gitignoreFiles = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))

  jsFiles.forEach((file) => {
    file = file.path || file
    promises.push(
      new Promise((resolve, reject) => {
        let split
        let altdest
        let newFile
        let newJS

        // parse whitelist and determine files exist
        if (usingWhitelist) {
          split = file.split(':')
          altdest = split[1]
          file = split[0]

          if (!fsr.fileExists(path.join(jsPath, file))) {
            reject(new Error(`${file} specified in JS whitelist does not exist. Please ensure file is entered properly.`.red))
            return
          }
        }

        if (gitignoreFiles.includes(path.basename(file)) || gitignoreFiles.includes(file) || file === '.' || file === '..') {
          resolve()
        }

        file = file.replace(jsPath, '')
        newFile = path.join(jsCompiledOutput, (altdest || file))

        // disable minify if minify param is false
        if (!params.minify || blacklist.includes(file.replace(/^[\\/]+/, ''))) {
          newJS = fs.readFileSync(path.join(jsPath, file), 'utf-8')
        } else {
          // compress the js via the compiler set in roosevelt params
          try {
            newJS = preprocessorModule.parse(app, file)
          } catch (err) {
            logger.error(`${appName} failed to parse ${path.join(jsPath, file)}. Please ensure that it is coded correctly`.red)
            reject(err)
            return
          }
        }

        // create build directory if it doesn't exist
        if (!fsr.fileExists(path.dirname(newFile))) {
          if (fsr.ensureDirSync(path.dirname(newFile))) {
            logger.log('📁', `${appName} making new directory ${path.dirname(newFile)}`.yellow)
          }
        }

        // create file if it doesn't exist
        fsr.openSync(newFile, 'a')

        // check existing file for matching content before writing
        if (fs.readFileSync(newFile, 'utf8') !== newJS) {
          if (fsr.writeFileSync(newFile, newJS)) {
            logger.log('📝', `${appName} writing new JS file ${newFile}`.green)
          }
          resolve()
        } else {
          resolve()
        }
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
