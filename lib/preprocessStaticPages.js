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
  const buildCache = app.get('buildCache') || require('./tools/buildCache')(app)
  const gitignoreFiles = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))
  const allowlist = app.get('params').html.allowlist
  const blocklist = app.get('params').html.blocklist

  // skip parsing static pages if feature is disabled or makeBuildArtifacts is false
  if (!params.html.sourcePath || !params.makeBuildArtifacts) return

  // change process directory to the statics pages directory so that templates located there can reference other templates using relative paths
  const oldDir = process.cwd()
  if (fs.pathExistsSync(params.html.sourcePath)) process.chdir(params.html.sourcePath)

  // render the pages only if any of them, or any of their models, are new/edited
  // all the pages are cached together instead of one at a time because view engines do not report which templates each page included
  const staticPagesKey = path.join(params.buildFolder, 'staticPages')
  const staticPagesSources = fs.existsSync(htmlPath) ? (await walk(htmlPath)).map(entry => entry.path || entry) : []
  if (buildCache.isFresh(staticPagesKey, staticPagesSources)) {
    process.chdir(oldDir)
    return
  }

  // the pages that get rendered below, collected for the build cache
  const staticPagesOutputs = []
  let staticPagesFailed = false

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

          // the default destination, which the folderPerPage param may override below
          // it is set up front so that a folderPerPage value roosevelt cannot apply falls back to it rather than leaving the page with nowhere to be written
          let outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${name}.html`)
          if (params.html.folderPerPage) {
            if (params.html.folderPerPage === true) outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${name}/${name}.html`)
            else if (typeof params.html.folderPerPage === 'string') {
              if (params.html.folderPerPage.includes('/')) logger.warn(`${appName} failed to apply \`folderPerPage\` param because it is an improperly formatted string. Please ensure that it is set correctly.`)
              else {
                // check if the name of the file is already the name of the folderPerPage value (e.g. index.html)
                if (params.html.folderPerPage.slice(0, -5) === name) outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${params.html.folderPerPage}`)
                else outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${name}/${params.html.folderPerPage}`)
              }
            } else logger.warn(`${appName} failed to apply \`folderPerPage\` param because it is neither a boolean nor a string. Please ensure that it is set correctly.`)
          }

          // minify the html if minification is enabled
          if (params.minify && params.html.minifier.enable) {
            newHtml = await htmlMinifier(newHtml, minifyOptions)
          }

          // validate the html if the validator is enabled
          let validHtml = true
          let validationErrors = []
          if (params.htmlValidator.enable) {
            const htmlValidatorResult = await expressValidator(newHtml)
            if (htmlValidatorResult.includes('<title>HTML did not pass validation</title>') && htmlValidatorResult.includes('<code class="validatorErrors">')) {
              validHtml = false
              validationErrors = parseValidationErrors(htmlValidatorResult)
            }
          }

          // check if html file already exists
          fsr.ensureDirSync(htmlRenderedOutput)
          if (fs.pathExistsSync(outpath)) {
            content = fs.readFileSync(outpath, 'utf8')
          }

          // check existing file for matching content before writing
          if (newHtml !== '' && content !== newHtml) {
            fsr.writeFileSync(outpath, newHtml, ['📝', `${appName} writing new HTML file ${outpath}`.green])
            if (!validHtml) {
              if (validationErrors.length) {
                logger.error(`↳ The file has ${validationErrors.length} HTML validation ${validationErrors.length === 1 ? 'error' : 'errors'}:`)
                for (const error of validationErrors) logger.error(`  • ${error.message}${error.line ? ` (line ${error.line}, column ${error.column})` : ''}`)
              } else {
                // the validator reported a failure but its error list could not be read, so fall back to pointing at an external validator
                logger.error(`↳ The file has HTML validation errors. Upload ${outpath} to https://validator.w3.org for details.`)
              }
            }
          }
          if (newHtml !== '') staticPagesOutputs.push(outpath)
          continue
        } catch (e) {
          staticPagesFailed = true
          logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly.`)
          logger.error(e)
        }
      }
    }
  }

  // remember the pages for the next build, or render them again next time if any of them failed
  if (staticPagesFailed) buildCache.forget(staticPagesKey)
  else buildCache.record(staticPagesKey, { outputs: staticPagesOutputs, sources: staticPagesSources })

  process.chdir(oldDir)
}

// express-html-validator hands back a rendered error page rather than a list of what went wrong, so the errors it embedded in that page are read back out of it
// each error occupies two lines: the message, then "At line N, column M"
// returns an empty array if the page cannot be read, which leaves the caller to fall back to a generic message rather than claiming there were no errors
function parseValidationErrors (validatorPage) {
  const errorBlock = validatorPage.match(/<code class="validatorErrors">([\s\S]*?)<\/code>/)
  if (!errorBlock) return []

  const errors = []
  const lines = unescapeHtml(errorBlock[1]).split('\n')
  for (let i = 0; i < lines.length; i++) {
    const message = lines[i].trim()
    if (!message) continue

    const position = (lines[i + 1] || '').match(/^At line (\d+), column (\d+)$/)
    if (position) {
      errors.push({ message, line: position[1], column: position[2] })
      i++ // the position line has been consumed
    } else errors.push({ message })
  }
  return errors
}

// the validator escapes its messages for display in the error page, so they are unescaped again for the console
// the ampersand is done last so that an escaped entity is not unescaped twice
function unescapeHtml (string) {
  return string
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
