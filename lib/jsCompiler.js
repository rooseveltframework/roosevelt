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
  const preprocessor = params.jsCompiler.nodeModule
  const jsPath = app.get('jsPath')
  const jsCompiledOutput = app.get('jsCompiledOutput')
  const usingWhitelist = !!params.jsCompilerWhitelist
  let jsFiles
  let preprocessorModule
  let preprocessorArgs
  let promises = []

  if (params.jsCompiler === 'none') {
    callback()
    return
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor)
  } catch (err) {
    console.error(`❌  ${appName} failed to include your JS compiler! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.`.red)
    console.error(err)
    callback()
    return
  }

  // examine API of preprocessor to ensure compatibility
  if (typeof preprocessorModule.parse === 'function') {
    preprocessorArgs = getFunctionArgs(preprocessorModule.parse)

    if ((preprocessorArgs.length !== 2) || (preprocessorArgs[0] !== 'app') || (preprocessorArgs[1] !== 'fileName')) {
      console.error(`❌  selected JavaScript compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
      process.exit()
    }
  } else {
    console.error(`❌  selected JavaScript compiler module ${preprocessor} out of date or incompatible with this version of Roosevelt.`.red.bold)
    process.exit()
  }

  // make js directory if not present
  if (!fileExists(jsPath)) {
    fse.mkdirsSync(jsPath)
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${jsPath}`.yellow)
    }
  }

  // check if using whitelist before populating jsFiles
  if (usingWhitelist) {
    if (typeof params.jsCompilerWhitelist !== 'object') {
      console.error('❌  jsCompilerWhitelist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions'.red)
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
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${jsCompiledOutput}`.yellow)
    }
  }

  jsFiles.forEach(function (file) {
    file = file.path || file
    promises.push(function (file) {
      return new Promise(function (resolve, reject) {
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

        if (file.charAt(0) === '.' || file === 'Thumbs.db' || fs.lstatSync(usingWhitelist ? path.join(jsPath, file) : file).isDirectory()) {
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
            reject(new Error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly\n` + err))
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
              reject(new Error(`${appName} failed to write new JS file ${newFile}\n ${err}`))
            }
            if (!app.get('params').suppressLogs.rooseveltLogs) {
              console.log(`📝  ${appName} writing new JS file ${newFile}`.green)
            }
            resolve()
          })
        } else {
          resolve()
        }
      })
    }(file))
  })

  Promise.all(promises)
    .then(() => {
      callback()
    })
    .catch((err) => {
      console.error('❌ ', `${err}`.red)
      process.exit()
    })
}
