require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const CleanCSS = require('clean-css')
const gitignoreScanner = require('./tools/gitignoreScanner')
const wildcardMatch = require('./tools/wildcardMatch')

module.exports = async app => {
  const params = app.get('params')
  const appName = app.get('appName')
  const cssPath = app.get('cssPath')
  const cssCompiledOutput = app.get('cssCompiledOutput')
  const usingAllowlist = !!params.css.allowlist
  const allowlist = app.get('params').css.allowlist
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  let preprocessorModule
  let customPreprocessor
  let versionFile
  let versionData
  let versionCode = '/* do not edit; generated automatically by Roosevelt */ '

  // skip compiling if feature is disabled or makeBuildArtifacts is false
  if (params.css.compiler === 'none' || params.css.compiler === null || !params.css.compiler.enable || !params.makeBuildArtifacts) return

  // generate css source/output directories
  fsr.ensureDirSync(cssPath)
  fsr.ensureDirSync(cssCompiledOutput)

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
      module = require(moduleName)
    } catch (err) {
      logger.error(`${appName} failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly installed to node_modules.`)
      logger.warn('CSS preprocessor has been disabled')
      params.css.compiler = 'none'
      return
    }

    // determine which preprocessor is in use and abstract a generic api for it
    if (moduleName === 'less') {
      preprocessorModule = {
        versionCode: app => `@${app.get('params').css.versionFile.varName}: '${app.get('appVersion')}';\n`,
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
              if (err) return reject(err)
              resolve(output.css)
            })
          })
        }
      }
    } else if (moduleName === 'sass') {
      preprocessorModule = {
        versionCode: app => `$${app.get('params').css.versionFile.varName}: '${app.get('appVersion')}';\n`,
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
              options.outFile = '' // This was added as in the Sass documentation for sourceMap, it states "If this option is true, the path is assumed to be the outFile option with .map added to the end. If it’s true and the outFile option isn’t passed, it has no effect."
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
              if (err) return reject(err)
              resolve(output.css)
            })
          })
        }
      }
    } else if (moduleName === 'stylus') {
      preprocessorModule = {
        versionCode: app => `${app.get('params').css.versionFile.varName} = '${app.get('appVersion')}';\n`,
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
              if (err) return reject(err)
              resolve(css)
            })
          })
        }
      }
    }
  }

  // check if using allowlist before populating cssFiles
  let cssFiles
  if (usingAllowlist) {
    if (typeof params.css.allowlist !== 'object') {
      logger.error('CSS allowlist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions')
      return
    } else cssFiles = params.css.allowlist
  } else cssFiles = klawSync(cssPath)

  // write versionFile
  if (params.css.versionFile) {
    if (!params.css.versionFile.fileName || typeof params.css.versionFile.fileName !== 'string') {
      logger.error(`${appName} failed to write versioned CSS file! fileName missing or invalid`)
    } else if (!params.css.versionFile.varName || typeof params.css.versionFile.varName !== 'string') {
      logger.error(`${appName} failed to write versioned CSS file! varName missing or invalid'`)
    } else {
      versionFile = path.join(cssPath, params.css.versionFile.fileName)
      versionCode += preprocessorModule.versionCode(app)

      // check if version file exists
      if (fs.pathExistsSync(versionFile)) {
        versionData = fs.readFileSync(versionFile, 'utf8')
      }

      // compare existing content to new content before generating
      if (!versionData || versionData !== versionCode) {
        fsr.writeFileSync(versionFile, versionCode, ['📝', `${appName} writing new versioned CSS file to reflect new version ${app.get('appVersion')} to ${versionFile}`.green])
      }
    }
  }

  // clean-css options
  const opts = params.css.minifier.options || {}

  // process each css file
  const promises = []
  const gitignoreFiles = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))
  for (let file of cssFiles) {
    // handle cases where file is an object provided by klaw
    file = file.path || file

    // filter out irrelevant files
    if (file !== '.' && file !== '..' && !gitignoreFiles.includes(path.basename(file)) && !gitignoreFiles.includes(file) && !fs.lstatSync(usingAllowlist ? path.join(cssPath, file.split(':')[0]) : file).isDirectory()) {
      // generate a promise for each file
      promises.push(
        // TODO: consider refactoring this confusing data structure
        new Promise((resolve, reject) => {
          (async () => {
            let split
            let altdest

            // check if this file is in the allowlist
            if (usingAllowlist) {
              split = file.split(':')
              altdest = split[1]
              file = path.join(cssPath, split[0])

              if (!fs.pathExistsSync(file) && !file.includes('*')) {
                reject(new Error(`${file} specified in CSS allowlist does not exist. Please ensure file is entered properly.`))
              }
            }
            try {
              let baseFile = file.replace(app.get('params').css.sourcePath + path.sep, '')

              // update filepath on windows
              if (process.platform === 'win32') baseFile = baseFile.replaceAll('\\', '/')

              if ((allowlist && allowlist.length > 0 && !wildcardMatch(baseFile, allowlist) && !wildcardMatch(baseFile + ':' + altdest, allowlist))) {
                // skip this file if it's not on the allowlist
                // but only if an allowlist exists
                return reject(new Error(`${file} specified in CSS allowlist does not exist. Please ensure file is entered properly.`))
              }

              // run file through the preprocessor
              let newCSS = await preprocessorModule.parse(app, file)

              // construct destination for compiled css
              const { name, dir } = path.parse(file)
              let content
              let outpath
              if (altdest) outpath = path.join(cssCompiledOutput, altdest)
              else outpath = path.join(cssCompiledOutput, dir.replace(cssPath, ''), `${name}.css`)

              // minify the css if minification is enabled
              if (params.minify && params.css.minifier.enable) {
                newCSS = new CleanCSS(opts).minify(newCSS).styles
              }

              // check if css file already exists
              if (fs.pathExistsSync(outpath)) {
                content = fs.readFileSync(outpath, 'utf8')
              }

              // check that the newCSS has content before writing the file. It is possible that the less file has no valid CSS and results in an empty CSS file. In this case don't write it.
              // also, check existing file for matching content before writing
              if (newCSS !== '' && (!content || content !== newCSS)) {
                fsr.writeFileSync(outpath, newCSS, ['📝', `${appName} writing new CSS file ${outpath}`.green])
              }
              resolve()
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

  try {
    await Promise.all(promises)
  } catch (err) {
    logger.error(err)
  }
}
