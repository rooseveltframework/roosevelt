// static page generator
require('@colors/colors')
const process = require('process')
const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const htmlMinifier = require('html-minifier-terser').minify
const gitignoreScanner = require('./tools/gitignoreScanner')
const wildcardMatch = require('./tools/wildcardMatch')

module.exports = async (app, callback) => {
  const params = app.get('params')
  const appName = app.get('appName')
  const htmlPath = app.get('htmlPath')
  const htmlRenderedOutput = app.get('htmlRenderedOutput')
  const expressValidator = require('express-html-validator')(params.htmlValidator)
  const minifyOptions = app.get('params').html.minifier.options
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const gitignoreFiles = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))
  const allowlist = app.get('params').html.allowlist
  const blocklist = app.get('params').html.blocklist

  // skip parsing static pages if feature is disabled or makeBuildArtifacts is false
  if (!params.html.sourcePath || !params.makeBuildArtifacts) return callback()

  const oldDir = process.cwd()
  if (fsr.fileExists(params.html.sourcePath)) process.chdir(params.html.sourcePath)

  // generate html output directory
  fsr.ensureDirSync(htmlRenderedOutput)

  const htmlFiles = klawSync(htmlPath)

  // process each html file
  for (let file of htmlFiles) {
    // handle cases where file is an object provided by klaw
    file = file.path || file

    // filter out irrelevant files
    if (file !== '.' && file !== '..' && !gitignoreFiles.includes(path.basename(file)) && !gitignoreFiles.includes(file) && !fs.lstatSync(file).isDirectory()) {
      try {
        const baseFile = file.replace(app.get('params').html.sourcePath + path.sep, '')
        if ((allowlist && allowlist.length > 0 && !wildcardMatch(baseFile, allowlist)) || (blocklist && blocklist.length > 0 && wildcardMatch(baseFile, blocklist))) {
          // skip this file if it's not on the allowlist
          // but only if an allowlist exists
          // also skip it if it's on the blocklist
          continue
        }

        let extension = file.split('.')
        extension = extension[extension.length - 1]
        if (extension === 'js' || extension === 'json') continue

        const renderer = app.get('view: ' + extension)
        if (!renderer) {
          logger.error(`${appName} failed to parse ${file}. There is no view engine for file type "${extension}" registered with the app.`)
          continue
        }

        let modelFile = file.slice(0, file.length - extension.length) + 'js'
        if (!fsr.fileExists(modelFile)) modelFile = file.slice(0, file.length - extension.length) + 'json'
        let modelData = app.get('htmlModels')[path.normalize(file.replace(app.get('htmlPath') + path.sep, ''))]
        if (!modelData && fsr.fileExists(modelFile)) {
          modelData = require(modelFile)
          if (typeof modelData === 'function') modelData = modelData(app)
          else logger.error(`${appName} failed to load ${modelFile} model. Please ensure that it is coded correctly.`)
        }
        const model = modelData || {}
        let newHtml = renderer(baseFile, model)

        // construct destination for rendered html
        const { name, dir } = path.parse(file)
        let content
        const outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${name}.html`)

        // minify the html if minification is enabled
        if (params.minify && params.html.minifier.enable) {
          newHtml = await htmlMinifier(newHtml, minifyOptions)
        }

        // validate the html if the validator is enabled
        if (params.htmlValidator.enable) {
          newHtml = await expressValidator(newHtml)
        }

        // check if html file already exists
        if (fsr.fileExists(outpath)) {
          content = fs.readFileSync(outpath, 'utf8')
        }

        // check existing file for matching content before writing
        if (newHtml !== '' && (!content || content !== newHtml)) {
          fsr.writeFileSync(outpath, newHtml, ['📝', `${appName} writing new HTML file ${outpath}`.green])
          if (params.htmlValidator.enable && newHtml.includes('<title>HTML did not pass validation</title>') && newHtml.includes('<code class="validatorErrors">')) {
            logger.error(`↳ The file has HTML validation errors. Open ${outpath} in your browser to see the details.`)
          }
        }
        continue
      } catch (e) {
        logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly.`)
        logger.error(e)
      }
    }
  }

  process.chdir(oldDir)
  callback()
}
