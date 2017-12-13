// js compiler

require('colors')

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const klawSync = require('klaw-sync')
const prequire = require('parent-require')
const fileExists = require('./fileExists')
const getFunctionArgs = require('./getFunctionArgs')

module.exports = function (app, callback) {
  const params = app.get('params')
  const appName = app.get('appName')
  const jsPath = app.get('jsPath')
  const jsCompiledOutput = app.get('jsCompiledOutput')
  const usingWhitelist = !!params.jsCompilerWhitelist
  const logger = require('./logger')(app)
  let preprocessor
  let jsFiles
  let preprocessorModule
  let preprocessorArgs
  let promises = []

  if (params.jsCompiler === 'none' || params.jsCompiler === null) {
    callback()
    return
  }

  preprocessor = params.jsCompiler.nodeModule

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor)
  } catch (err) {
    logger.error(`${appName} failed to include your JS compiler! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.\n`.red, err)
    logger.warn('JS compiler has been disabled'.yellow)
    params.jsCompiler = 'none'
    callback()
    return
  }

  // examine API of preprocessor to ensure compatibility
  if (typeof preprocessorModule.parse === 'function') {
    preprocessorArgs = getFunctionArgs(preprocessorModule.parse)

    if ((preprocessorArgs.length !== 2) || (preprocessorArgs[0] !== 'app') || (preprocessorArgs[1] !== 'fileName')) {
      logger.error(`Selected JavaScript compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
      process.exit()
    }
  } else {
    logger.error(`Selected JavaScript compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
    process.exit()
  }

  // make js directory if not present
  if (!fileExists(jsPath)) {
    fse.mkdirsSync(jsPath)
    logger.log('📁', `${appName} making new directory ${jsPath}`.yellow)
  }

  // check if using whitelist before populating jsFiles
  if (usingWhitelist) {
    if (typeof params.jsCompilerWhitelist !== 'object') {
      logger.error('jsCompilerWhitelist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions'.red)
      callback()
      return
    } else {
      jsFiles = params.jsCompilerWhitelist
    }
  } else {
    jsFiles = klawSync(jsPath)
  }

  // make js compiled output directory if not present
  if (params.jsCompiler && params.jsCompiler.nodeModule && !fileExists(jsCompiledOutput)) {
    fse.mkdirsSync(jsCompiledOutput)
    logger.log('📁', `${appName} making new directory ${jsCompiledOutput}`.yellow)
  }

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

          if (!fileExists(path.join(jsPath, file))) {
            reject(new Error(`${file} specified in jsCompilerWhitelist does not exist. Please ensure file is entered properly.`))
          }
        }

        if (file === '.' || file === '..' || file === 'Thumbs.db' || fs.lstatSync(usingWhitelist ? path.join(jsPath, file) : file).isDirectory()) {
          resolve()
        }

        file = file.replace(jsPath, '')
        newFile = path.join(jsCompiledOutput, (altdest || file))

        // disable minify if noMinify param is present in roosevelt
        if (app.get('params').noMinify) {
          newJS = fs.readFileSync(path.join(jsPath, file), 'utf-8')
        } else {
          // compress the js via the compiler set in roosevelt params
          try {
            newJS = preprocessorModule.parse(app, file)
          } catch (err) {
            logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly`.red)
            reject(err)
          }
        }

        // create build directory
        fse.mkdirsSync(path.dirname(newFile))

        // create file if it doesn't exist
        fs.openSync(newFile, 'a')

        // check existing file for matching content before writing
        if (fs.readFileSync(newFile, 'utf8') !== newJS) {
          fs.writeFile(newFile, newJS, (err) => {
            if (err) {
              console.error(`${appName} failed to write new JS file ${newFile}`.red)
              reject(err)
            }
            logger.log('📝', `${appName} writing new JS file ${newFile}`.green)
            resolve()
          })
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
      logger.error(`${err}`.red)
      process.exit()
    })
}
