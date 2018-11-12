require('colors')

// Views Bundler: Module to expose templates that are available on the server down to the client as well

module.exports = function (app) {
  const fse = require('fs-extra')
  const path = require('path')
  const klaw = require('klaw-sync')
  const htmlMinifier = require('html-minifier').minify
  const fsr = require('./fsr')(app)
  const logger = require('./logger')(app.get('params').logging)
  const appName = app.get('appName')
  const viewsPath = app.get('viewsPath')
  const { minify: willMinifyTemplates, exposeAll, whitelist, blacklist, defaultBundle } = app.get('params').clientViews
  const basePath = app.get('clientViewsBundledOutput')
  let minifyOptions = app.get('params').clientViews.minifyOptions

  // Regular expression to grab filename from <!-- roosevelt-whitelist --> tags
  let regex = /<!--+\s*roosevelt-whitelist\s*([\w-/.]+\.?(js)?)\s*--+>/g

  let outputBundles = {}

  // List of filepaths that have been already read.
  let filesCache = []

  let templateComment
  let fileName
  let contents
  let bundleLocation

  // If the clientViews minifyOptions is empty, default back to the htmlMinifier options
  if (Object.keys(minifyOptions).length === 0) {
    minifyOptions = app.get('params').htmlMinifier.options
  }

  // Loop through each bundle in the whitelist of the roosevelt configs
  for (let bundleName in whitelist) {
    let bundleFilepaths = whitelist[bundleName]
    const bundleFilepathsLength = bundleFilepaths !== null ? bundleFilepaths.length : 0

    // If the list of files for a particular bundle is empty, continue to the next bundle
    if (bundleFilepathsLength === 0) {
      logger.warn((' no files listed to be outputted in bundle ' + bundleName).yellow)
      // return
      continue
    }

    // Load in each template for each bundle
    for (let file of bundleFilepaths) {
      fileName = file
      let fileNameAndPath = path.join(viewsPath, file)

      // Add .html if the extension is blank
      if (path.extname(file) === '') {
        fileName += '.html'
        fileNameAndPath += '.html'
      }

      try {
        contents = fse.readFileSync(fileNameAndPath, 'utf8').trim()
        filesCache.push(fileNameAndPath)
      } catch (error) {
        // File may not exist. Log such error
        logger.error(error)
      }

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, bundleName, 'whitelist')
      } catch (error) {
        // Error is thrown when template contains <!-- roosevelt-blacklist -->. Skip this template
        logger.error(error)
        continue
      }

      // Add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }

  if (exposeAll) {
    // Use klaw to find all files in the views path except ones that are part of the blacklist param of in the clientViews property in the Roosevelt config
    const blacklistPaths = blacklist.map(blacklistItem => path.join(viewsPath, blacklistItem))
    const allFilePaths = klaw(viewsPath, { filter: item => !blacklistPaths.includes(item.path), nodir: true }).map(file => file.path)

    for (let filePath of allFilePaths) {
      if (filesCache.includes(filePath)) {
        logger.log('💭', `file already exposed. continuing...`.bold)
        continue
      }

      // The filePath object is the absolute path of the file. Delete the viewsPath portion from the filePath
      fileName = removeBasePath(filePath, viewsPath)

      contents = fse.readFileSync(filePath, 'utf8').trim()
      filesCache.push(filePath)

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, defaultBundle, 'exposeAll')
      } catch (error) {
        // Error is thrown when template contains <!-- roosevelt-blacklist -->. Skip this template
        logger.error(error)
        continue
      }

      // Add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }

  // Loop through each bundle, preprocess it, and save it to the specified location on the filesystem
  for (let bundleFilename in outputBundles) {
    saveBundle(outputBundles[bundleFilename], bundleFilename)
  }

  /* ======== Internal Functions ======== */

  function parseTemplateComment (templateComment, contents, defaultBundle, locationMethod) {
    let bundleLocation

    if (templateComment.includes('roosevelt-blacklist')) {
      // If the template is blacklisted, throw an error and skip this
      throw Error(`This item was tried to be exposed in the ${locationMethod} method, but included a <!-- roosevelt-blacklist --> tag and will not be exposed`)
    } else if (templateComment.includes('roosevelt-whitelist')) {
      // If it is whitelisted, remove the tag from the contents and set the bundle location to the string found with the regex
      contents = contents.split('\n').slice(1).join('\n')

      bundleLocation = regex.exec(templateComment)[1]
    } else {
      // Otherwise, save it to a default bundle
      bundleLocation = defaultBundle
    }

    return [bundleLocation, contents]
  }

  function storeContents (contents, bundleLocation, fileName) {
    // If the bundle doesn't exist in the outputBundles object yet, initialize an empty object
    if (outputBundles[bundleLocation] === null || outputBundles[bundleLocation] === undefined) {
      outputBundles[bundleLocation] = {}
    }

    outputBundles[bundleLocation][fileName] = contents
  }

  function removeBasePath (filePath, basePath) {
    let filePathArr = filePath.split(path.sep)
    let basePathArr = basePath.split(path.sep)
    let basePathLen = basePathArr.length

    let retStrArr = []

    for (let i = 0; i < filePathArr.length; i++) {
      // Push the current section of the filePathArr as long as it either differs from the basePathArr or the index is greater than the length of the basePathArr
      if (i >= basePathLen || filePathArr[i] !== basePathArr[i]) {
        retStrArr.push(filePathArr[i])
      }
    }

    return retStrArr.join(path.sep)
  }

  function saveBundle (bundle, filename) {
    let fileData
    let writePath = path.join(basePath, filename)

    for (let tempFilename in bundle) {
      bundle[tempFilename] = preprocess(bundle[tempFilename], tempFilename)
    }
    // Check if the directory exists
    if (!fsr.fileExists(basePath)) {
      if (fsr.ensureDirSync(basePath)) {
        logger.log('📁  ' + ('Roosevelt making new directory ' + basePath).bold)
      }
    }

    fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'

    fileData += `module.exports = function() {\n  return ${JSON.stringify(bundle)}\n}\n`

    // Save the file
    if (fsr.writeFileSync(writePath, fileData, 'utf8')) {
      logger.log('📝' + '  ' + (appName + ' writing new JS file ' + writePath).green)
    }
  }

  function preprocess (file, name) {
    const { onClientViewsProcess } = app.get('params')

    // If the onClientViewsProcess event is defined, pass the current file through it
    if (onClientViewsProcess !== undefined) {
      file = onClientViewsProcess(file)
    }

    // Minify the file if the option is turned on (and it is not a pug file since pug can't really be minified)
    if (willMinifyTemplates && path.extname(name) !== 'pug' && file.length > 0) {
      file = htmlMinifier(file, minifyOptions)
    }

    return file
  }
}
