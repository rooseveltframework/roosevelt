// static page generator
require('@colors/colors')
const process = require('process')
const fs = require('fs-extra')
const path = require('path')
const { walk } = require('@nodelib/fs.walk/promises')
const htmlMinifier = require('html-minifier-terser').minify
const gitignoreScanner = require('./tools/gitignoreScanner')
const wildcardMatch = require('./tools/wildcardMatch')

module.exports = async app => {
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
  if (!params.html.sourcePath || !params.makeBuildArtifacts) return

  // change process directory to the statics pages directory so that templates located there can reference other templates using relative paths
  const oldDir = process.cwd()
  if (fs.pathExistsSync(params.html.sourcePath)) process.chdir(params.html.sourcePath)

  // process each html file
  if (fs.existsSync(htmlPath)) {
    for (let file of await walk(htmlPath)) {
      // handle cases where file is an object provided by fsWalk
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

          const contents = fs.readFileSync(file, 'utf8').trim()
          const fileComment = contents.split('\n')[0]
          if (fileComment.includes('roosevelt-blocklist')) continue

          const renderer = app.get('view: ' + extension)
          if (!renderer) {
            logger.error(`${appName} failed to parse ${file}. There is no view engine for file type "${extension}" registered with the app.`)
            continue
          }

          let modelFile = file.slice(0, file.length - extension.length) + 'js'
          if (!fs.pathExistsSync(modelFile)) modelFile = file.slice(0, file.length - extension.length) + 'json'

          // define model
          let model = {}

          // source from globals first
          model = { ...model, ...app.get('htmlModels')['*'] }

          // then from model files
          if (fs.pathExistsSync(modelFile)) {
            let modelFunction
            try {
              modelFunction = await require(modelFile)
            } catch (err) {
              modelFunction = require(modelFile)
            }
            if (typeof modelFunction === 'function') model = { ...model, ...modelFunction(app) }
            else logger.error(`${appName} failed to load ${modelFile} model. Please ensure that it is coded correctly.`)
          }

          // then from specific constructor-level definitions
          model = { ...model, ...app.get('htmlModels')[path.normalize(file.replace(app.get('htmlPath') + path.sep, ''))] }

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
          fsr.ensureDirSync(htmlRenderedOutput)
          if (fs.pathExistsSync(outpath)) {
            content = fs.readFileSync(outpath, 'utf8')
          }

          // check existing file for matching content before writing
          if (newHtml !== '' && content !== newHtml) {
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
  }

  process.chdir(oldDir)
}
