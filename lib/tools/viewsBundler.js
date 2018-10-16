// Views Bundler: Module to expose views from server to be used also on the client

module.exports = function (app) {
  const fse = require('fs-extra')
  const path = require('path')
  const htmlMinifier = require('html-minifier').minify
  const fsr = require('./fsr')(app)
  const logger = require('./logger')(app.get('params').logging)
  const appName = app.get('appName')
  const viewsPath = app.get('viewsPath')
  const minifyTemplates = app.get('params').clientViews.minify
  const bundles = app.get('clientViewBundles')
  const bundlesLength = Object.keys(bundles).length
  const basePath = app.get('clientViewsBundledOutput')

  let minifyOptions = {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    remoaveAttributeQuotes: true,
    removeEmptyAttributes: true
  }

  // If there are no bundles, return
  if (bundlesLength === 0) {
    return
  }

  for (const key in bundles) {
    generateBundle(key, bundles[key])
  }

  function generateBundle (key, whitelist) {
    const templates = {}
    const whitelistLength = whitelist !== null && whitelist !== undefined ? whitelist.length : 0
    const writePath = path.join(basePath, key)
    let fileData

    // If there are no entries in the whitelist, return
    if (whitelistLength === 0) {
      return
    }

    for (const item of whitelist) {
      let fileName = item
      let fileNameAndPath = path.join(viewsPath + '/' + item)
      let contents

      // Add .html extension if it is not present
      if (path.extname(item) === '') {
        fileNameAndPath += '.html'
        fileName += '.html'
      }

      try {
        contents = fse.readFileSync(fileNameAndPath, 'utf8').trim()
      } catch (e) {
        logger.error(e)
      }

      // Minify templates (other than pug files which can't be minified with the html-minifier)
      if (minifyTemplates && path.extname(item) !== 'pug' && contents.length > 0) {
        contents = htmlMinifier(contents, minifyOptions)
      }

      templates[fileName] = contents
    }

    if (!fsr.fileExists(basePath)) {
      if (fsr.ensureDirSync(basePath)) {
        logger.log('📁  ' + ('Roosevelt making new directory ' + basePath).warn)
      }
    }

    fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'

    fileData += `module.exports = function() {\n  return ${JSON.stringify(templates)}\n}\n`

    if (fsr.writeFileSync(writePath, fileData, 'utf8')) {
      logger.log('📝' + '  ' + (appName + ' writing new JS file ' + writePath).success)
    }
  }
}
