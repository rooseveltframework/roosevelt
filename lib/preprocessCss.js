// css preprocessor

require('colors')

const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const CleanCSS = require('clean-css')
const prequire = require('parent-require')

module.exports = (app, callback) => {
  const params = app.get('params')
  const appName = app.get('appName')
  const cssPath = app.get('cssPath')
  const cssCompiledOutput = app.get('cssCompiledOutput')
  const usingWhitelist = !!params.css.whitelist
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const promises = []
  let cssFiles
  let preprocessorModule
  let customPreprocessor
  let versionFile
  let versionCode = '/* do not edit; generated automatically by Roosevelt */ '

  // skip compiling if feature is disabled or generateFolderStructure is false
  if (params.css.compiler === 'none' || params.css.compiler === null || !params.css.compiler.enable || !params.generateFolderStructure) {
    callback()
    return
  }

  // make css directory if not present
  if (!fsr.fileExists(cssPath)) {
    if (fsr.ensureDirSync(cssPath)) {
      logger.info('📁', `${appName} making new directory ${cssPath}`.yellow)
    }
  }

  // make css compiled output directory if not present
  if (!fsr.fileExists(cssCompiledOutput)) {
    if (fsr.ensureDirSync(cssCompiledOutput)) {
      logger.info('📁', `${appName} making new directory ${cssCompiledOutput}`.yellow)
    }
  }

  // check if a user defined compiler is in use
  if (params.cssCompiler && typeof params.cssCompiler === 'function') {
    customPreprocessor = params.cssCompiler(app)

    // validate user defined preprocessor function
    if (customPreprocessor && typeof customPreprocessor.versionCode === 'function' && typeof customPreprocessor.parse === 'function') {
      preprocessorModule = customPreprocessor
      logger.info('⚙️', `${appName} using your custom CSS preprocessor`.bold)
    } else {
      customPreprocessor = false
    }
  }

  // use the normally configured preprocessor otherwise
  if (!customPreprocessor) {
    // get preprocessor name
    const moduleName = params.css.compiler.module
    let module

    // attempt to require that preprocessor
    try {
      module = prequire(moduleName)
    } catch (err) {
      logger.error(`${appName} failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly installed to node_modules.`)
      logger.warn('CSS preprocessor has been disabled')
      params.css.compiler = 'none'
      callback()
      return
    }

    // determine which preprocessor is in use and abstract a generic api for it
    if (moduleName === 'less') {
      preprocessorModule = {
        versionCode: app => {
          return `@${app.get('params').css.versionFile.varName}: '${app.get('appVersion')}';\n`
        },

        parse: (app, file) => {
          return new Promise((resolve, reject) => {
            const compilerOptions = app.get('params').css.compiler.options
            const env = app.get('env')

            // set less options based on roosevelt config
            const options = {
              ...compilerOptions,
              paths: app.get('cssPath'),
              filename: path.basename(file)
            }

            // get file contents
            const lessString = fs.readFileSync(file, 'utf8')

            // enable inline source mapping in dev mode
            if (env === 'development') {
              options.sourceMap = {
                sourceMapFileInline: true,
                outputSourceFiles: true
              }
            } else {
              // disable source mapping in prod mode
              options.sourceMap = undefined
            }

            module.render(lessString, options, (err, output) => {
              if (err) {
                reject(err)
              }

              resolve(output.css)
            })
          })
        }
      }
    } else if (moduleName === 'node-sass') {
      preprocessorModule = {
        versionCode: app => {
          return `$${app.get('params').css.versionFile.varName}: '${app.get('appVersion')}';\n`
        },

        parse: (app, file) => {
          return new Promise((resolve, reject) => {
            const env = app.get('env')
            const compilerOptions = app.get('params').css.compiler.params
            const options = {
              ...compilerOptions,
              file: path.basename(file),
              data: fs.readFileSync(file, 'utf8'),
              includePaths: [app.get('cssPath')]
            }

            // enable inline source mapping in dev mode
            if (env === 'development') {
              options.sourceMap = true
              options.sourceMapEmbed = true
              options.sourceMapContents = true
            } else {
              // disable source mapping in prod mode
              options.sourceMap = undefined
              options.outFile = undefined
              options.sourceMapEmbed = undefined
              options.omitSourceMapUrl = undefined
              options.sourceMapRoot = undefined
            }

            module.render(options, (err, output) => {
              if (err) {
                reject(err)
                return
              }

              resolve(output.css)
            })
          })
        }
      }
    } else if (moduleName === 'stylus') {
      preprocessorModule = {
        versionCode: app => {
          return `${app.get('params').css.versionFile.varName} = '${app.get('appVersion')}';\n`
        },

        parse: (app, file) => {
          return new Promise((resolve, reject) => {
            const compilerOptions = app.get('params').css.compiler.options
            const env = app.get('env')

            // set less options based on roosevelt config
            const options = {
              ...compilerOptions,
              paths: [app.get('cssPath')],
              filename: file
            }

            // get file contents
            const stylusInput = fs.readFileSync(file, 'utf8')

            // enable inline source mapping in dev mode
            if (env === 'development') {
              options.sourcemap = {
                comment: false,
                inline: true
              }
            } else {
              // disable source mapping in prod mode
              options.sourcemap = undefined
            }

            module.render(stylusInput, options, (err, css) => {
              if (err) {
                reject(err)
              }

              resolve(css)
            })
          })
        }
      }
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
  const opts = params.css.minifier.options || {}

  // process each css file
  for (let file of cssFiles) {
    // handle cases where file is an object provided by klaw
    file = file.path || file

    // filter out non css files
    if (file !== '.' && file !== '..' && file !== 'Thumbs.db' && !fs.lstatSync(usingWhitelist ? path.join(cssPath, file.split(':')[0]) : file).isDirectory()) {
      // generate a promise for each file
      promises.push(
        new Promise((resolve, reject) => {
          (async () => {
            let split
            let altdest

            // check if this file is in the whitelist
            if (usingWhitelist) {
              split = file.split(':')
              altdest = split[1]
              file = path.join(cssPath, split[0])

              if (!fsr.fileExists(file)) {
                reject(new Error(`${file} specified in CSS whitelist does not exist. Please ensure file is entered properly.`))
              }
            }

            try {
              // run file through the preprocessor
              let newCSS = await preprocessorModule.parse(app, file)

              // construct destination for compiled css
              const { name, dir } = path.parse(file)
              let outpath

              if (altdest) {
                outpath = path.join(cssCompiledOutput, altdest)
              } else {
                outpath = path.join(cssCompiledOutput, dir.replace(cssPath, ''), `${name}.css`)
              }

              // minify the css if minification is enabled
              if (params.minify && params.css.minifier.enable) {
                newCSS = new CleanCSS(opts).minify(newCSS).styles
              }

              // create build directory if it doesn't exist
              if (!fsr.fileExists(path.dirname(outpath))) {
                if (fsr.ensureDirSync(path.dirname(outpath))) {
                  logger.info('📁', `${appName} making new directory ${path.dirname(outpath)}`.yellow)
                }
              }

              // create file if it doesn't exist
              fsr.openSync(outpath, 'a')

              // check existing file for matching content before writing
              if (fs.readFileSync(outpath, 'utf8') !== newCSS) {
                if (fsr.writeFileSync(outpath, newCSS)) {
                  logger.info('📝', `${appName} writing new CSS file ${outpath}`.green)
                }
                resolve()
              } else {
                resolve()
              }
            } catch (e) {
              logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly.`)
              logger.error(e)
              reject(e)
            }
          })()
        })
      )
    }
  }

  Promise.all(promises)
    .then(() => {
      callback()
    })
    .catch(err => {
      logger.error(err)
      callback()
    })
}
