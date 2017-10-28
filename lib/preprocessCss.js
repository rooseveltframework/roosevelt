// css preprocessor

require('colors')

const fs = require('fs')
const fse = require('fs-extra')
const klawSync = require('klaw-sync')
const prequire = require('parent-require')
const path = require('path')
const fileExists = require('./fileExists')

module.exports = function (app, callback) {
  const params = app.get('params')
  const appName = app.get('appName')
  const cssPath = app.get('cssPath')
  const cssCompiledOutput = app.get('cssCompiledOutput')
  const preprocessor = params.cssCompiler.nodeModule
  let preprocessorModule
  let cssFiles = []
  let cssDirectories = []
  let versionFile
  let versionCode = '/* do not edit; generated automatically by Roosevelt */ '
  let promises = []

  if (params.cssCompiler === 'none') {
    return
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor)
  } catch (err) {
    console.error(`❌  ${appName} failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.`.red)
    console.error(err)
  }

  // get css files to compile
  if (params.cssCompilerWhitelist) {
    cssFiles = params.cssCompilerWhitelist
  } else {
    cssFiles = klawSync(cssPath)

    cssDirectories = cssFiles.filter(function (arrayElement) {
      arrayElement = arrayElement.path
      if (fs.statSync(arrayElement).isDirectory()) {
        return arrayElement
      }
    })
    cssFiles = cssFiles.filter(function (arrayElement) {
      arrayElement = arrayElement.path
      if (fs.statSync(arrayElement).isFile()) {
        return arrayElement
      }
    })
  }

  // make css directory if not present
  if (!fileExists(cssPath)) {
    fse.mkdirsSync(cssPath)
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${cssPath}`.yellow)
    }
  }

  // make css compiled output directory if not present
  if (params.cssCompiler && params.cssCompiler.nodeModule && !fileExists(cssCompiledOutput)) {
    fse.mkdirsSync(cssCompiledOutput)
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${cssCompiledOutput}`.yellow)
    }
  }

  // write versionedCssFile
  if (params.versionedCssFile) {
    if (!params.versionedCssFile.fileName || typeof params.versionedCssFile.fileName !== 'string') {
      console.error(`❌  ${appName} failed to write versionedCssFile file! fileName missing or invalid`.red)
    } else if (!params.versionedCssFile.varName || typeof params.versionedCssFile.varName !== 'string') {
      console.error(`❌  ${appName} failed to write versionedCssFile file! varName missing or invalid'`.red)
    } else {
      versionFile = path.join(cssPath, params.versionedCssFile.fileName)
      versionCode += preprocessorModule.versionCode(app)

      fs.openSync(versionFile, 'a') // create it if it does not already exist
      if (fs.readFileSync(versionFile, 'utf8') !== versionCode) {
        fs.writeFile(versionFile, versionCode, function (err) {
          if (err) {
            console.error(`❌  ${appName} failed to write versionedCssFile file!`.red)
            console.error(err)
          } else {
            if (!app.get('params').suppressLogs.rooseveltLogs) {
              console.log(`📝  ${appName} writing new versionedCssFile to reflect new version ${app.get('appVersion')} to ${versionFile}`.green)
            }
          }
        })
      }
    }
  }

  // make css compiled output subdirectory tree
  cssDirectories.forEach(function (directory) {
    fse.mkdirsSync(path.join(cssCompiledOutput, directory))
  })

  cssFiles.forEach(function (file) {
    file = file.path ? file.path : file
    file = path.basename(file)
    promises.push(function (file) {
      return new Promise(function (resolve, reject) {
        if (file.charAt(0) === '.' || file === 'Thumbs.db') {
          resolve()
          return
        }
        preprocessorModule.parse(app, file, function (err, newFile, newCss) {
          if (err) {
            console.error(`❌  ${appName} failed to parse ${file}. Please ensure that it is coded correctly.`.red)
            console.error(err)
            resolve()
          } else {
            fs.openSync(newFile, 'a') // create it if it does not already exist
            if (fs.readFileSync(newFile, 'utf8') !== newCss) {
              fs.writeFile(newFile, newCss, function (err) {
                if (err) {
                  console.error(`❌  ${appName} failed to write new CSS file ${newFile}`.red)
                  console.error(err)
                } else {
                  if (!app.get('params').suppressLogs.rooseveltLogs) {
                    console.log(`📝  ${appName} writing new CSS file ${newFile}`.green)
                  }
                }
                resolve()
              })
            } else {
              resolve()
            }
          }
        })
      })
    }(file))
  })

  Promise.all(promises).then(function () {
    callback()
  })
}
