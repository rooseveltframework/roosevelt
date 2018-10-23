// Views Bundler: Module to expose views from server to be used also on the client

module.exports = function (app) {
  const fse = require('fs-extra')
  const path = require('path')
  const klaw = require('klaw-sync')
  const htmlMinifier = require('html-minifier').minify
  const fsr = require('./fsr')(app)
  const logger = require('./logger')(app.get('params').logging)
  const appName = app.get('appName')
  const viewsPath = app.get('viewsPath')
  const willMinifyTemplates = app.get('params').clientViews.minify
  const exposeAll = app.get('params').clientViews.exposeAll
  const blacklist = app.get('params').clientViews.blacklist
  const defaultBundleLocation = app.get('params').clientViews.defaultBundle
  const bundles = app.get('clientViewBundles')
  const bundlesLength = Object.keys(bundles).length
  const basePath = app.get('clientViewsBundledOutput')
  let minifyOptions

  // Use the clientViews minifyOptions if exists, otherwise default back to the htmlMinify options
  if (app.get('params').clientViews.minifyOptions && Object.keys(app.get('params').clientViews.minifyOptions).length > 0) {
    minifyOptions = app.get('params').clientViews.minifyOptions
  } else {
    minifyOptions = app.get('params').htmlMinify.options
  }

  // If decided to expose all views, push them all excluding ones on the blacklist out and then return
  if (exposeAll) {
    exposeAllViews(viewsPath, blacklist)

    return
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

      contents = preprocessAndMinifyTemplate(item, contents)

      templates[fileName] = contents
    }

    saveBundle(templates, key)
  }

  function exposeAllViews (viewsPath, blacklist) {
    const blacklistPaths = blacklist.map(blacklistItem => path.join(viewsPath, blacklistItem))
    const allFilePaths = klaw(viewsPath, { filter: item => !blacklistPaths.includes(item.path), nodir: true }).map(file => file.path)

    let bundles = {}

    allFilePaths.forEach(function (filePath) {
      let contents = fse.readFileSync(filePath, 'utf8').trim()
      let templateComment = contents.split('\n')[0]
      let templateCommentExists
      let bundleLocation
      let blacklisted

      if (templateComment.includes('roosevelt-whitelist')) {
        // Whitelist with specific output file
        templateCommentExists = true
        let bundleName = templateComment.split(' ')[2]
        bundleLocation = bundleName

        console.log(`Saving to ${bundleName}`)
      } else if (templateComment.includes('roosevelt-blacklist')) {
        // blacklisted. ignore
        templateCommentExists = true
        console.log('blacklisted')
        blacklisted = true
        // return
      } else {
        // put in default bundle
        templateCommentExists = false
        bundleLocation = defaultBundleLocation
      }

      // Delete the first line if it is a roosevelt template comment
      if (templateCommentExists) {
        contents = contents.split('\n').slice(1).join('\n')
      }

      contents = preprocessAndMinifyTemplate(filePath, contents)

      if (blacklisted === undefined || !blacklisted) {
        if (bundles[bundleLocation] === undefined || bundles[bundleLocation] === null) {
          bundles[bundleLocation] = {}
        }

        bundles[bundleLocation][filePath] = contents
      }
    })

    for (let bundleFilename in bundles) {
      saveBundle(bundles[bundleFilename], bundleFilename)
    }
  }

  function saveBundle (bundle, filename) {
    let fileData
    let writePath = path.join(basePath, filename)

    if (!fsr.fileExists(basePath)) {
      if (fsr.ensureDirSync(basePath)) {
        logger.log('📁  ' + ('Roosevelt making new directory ' + basePath).warn)
      }
    }

    fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'

    fileData += `module.exports = function() {\n  return ${JSON.stringify(bundle)}\n}\n`

    if (fsr.writeFileSync(writePath, fileData, 'utf8')) {
      logger.log('📝' + '  ' + (appName + ' writing new JS file ' + writePath).success)
    }
  }

  function preprocessAndMinifyTemplate (filePath, contents) {
    // Pass to defined preprocessor if it exists
    if (app.get('params').onClientViewsProcess !== undefined) {
      contents = app.get('params').onClientViewsProcess(contents)
    }

    // Minify templates (other than pug files which can't be minified with the html-minifier)
    if (willMinifyTemplates && path.extname(filePath) !== 'pug' && contents.length > 0) {
      contents = htmlMinifier(contents, minifyOptions)
    }

    return contents
  }
}
