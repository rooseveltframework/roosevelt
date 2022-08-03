// static page preprocessor

require('@colors/colors')

const fs = require('fs-extra')
const path = require('path')
const klawSync = require('klaw-sync')
const gitignoreScanner = require('./tools/gitignoreScanner')

module.exports = (app, callback) => {
  const params = app.get('params')
  const appName = app.get('appName')
  const htmlPath = app.get('htmlPath')
  const htmlRenderedOutput = app.get('htmlRenderedOutput')
  const htmlMinifier = require('html-minifier').minify
  const minifyOptions = app.get('params').html.minifier.options
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const promises = []
  const gitignoreFiles = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))

  // skip parsing static pages if feature is disabled or makeBuildArtifacts is false
  if (!params.html.sourcePath || !params.makeBuildArtifacts) {
    callback()
    return
  }

  // generate html source/output directories
  fsr.ensureDirSync(htmlPath)
  fsr.ensureDirSync(htmlRenderedOutput)

  const htmlFiles = klawSync(htmlPath)

  // process each html file
  for (let file of htmlFiles) {
    // handle cases where file is an object provided by klaw
    file = file.path || file

    // filter out irrelevant files
    if (file !== '.' && file !== '..' && !gitignoreFiles.includes(path.basename(file)) && !gitignoreFiles.includes(file) && !fs.lstatSync(file).isDirectory()) {
      // generate a promise for each file
      promises.push(
        new Promise((resolve, reject) => {
          (async () => {
            let extension = file.split('.')
            extension = extension[extension.length - 1]
            const renderer = app.get('view: ' + extension)
            if (!renderer) {
              logger.error(`${appName} failed to parse ${file}. There is no view engine for file type "${extension}" registered with the app.`)
              resolve()
            } else {
              try {
                const modelData = app.get('htmlModels')[path.normalize(file.replace(app.get('htmlPath') + '/', ''))]
                const model = modelData || {}
                let newHtml = renderer(file, model)

                // minify the html if minification is enabled
                if (params.minify && params.html.minifier.enable) {
                  newHtml = htmlMinifier(newHtml, minifyOptions)
                }

                // construct destination for rendered html
                const { name, dir } = path.parse(file)
                let content
                const outpath = path.join(htmlRenderedOutput, dir.replace(htmlPath, ''), `${name}.html`)

                // check if html file already exists
                if (fsr.fileExists(outpath)) {
                  content = fs.readFileSync(outpath, 'utf8')
                }

                // check existing file for matching content before writing
                if (newHtml !== '' && (!content || content !== newHtml)) {
                  fsr.writeFileSync(outpath, newHtml, ['📝', `${appName} writing new HTML file ${outpath}`.green])
                }
                resolve()
              } catch (e) {
                logger.error(`${appName} failed to parse ${file}. Please ensure that it is coded correctly.`)
                logger.error(e)
                reject(e)
              }
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
