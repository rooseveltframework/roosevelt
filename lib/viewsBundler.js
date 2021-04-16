require('colors')

// Views Bundler: Module to expose templates that are available on the server down to the client as well

module.exports = app => {
  const fse = require('fs-extra')
  const path = require('path')
  const klaw = require('klaw-sync')
  const gitignoreScanner = require('./tools/gitignoreScanner')
  const htmlMinifier = require('html-minifier').minify
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')
  const appName = app.get('appName')
  const viewsPath = app.get('viewsPath')
  const { minify: willMinifyTemplates, exposeAll, allowlist, blocklist, defaultBundle } = app.get('params').clientViews
  const basePath = app.get('clientViewsBundledOutput')
  let minifyOptions = app.get('params').clientViews.minifyOptions

  // Regular expression to grab filename from <!-- roosevelt-allowlist --> tags
  const regex = /<!--+\s*roosevelt-allowlist\s*([\w-/.]+\.?(js)?)\s*--+>/g

  const outputBundles = {}

  // List of filepaths that have been already read.
  const filesCache = []

  let templateComment
  let fileName
  let contents
  let bundleLocation

  // If the clientViews minifyOptions is empty, default back to the htmlMinifier options
  if (Object.keys(minifyOptions).length === 0) {
    minifyOptions = app.get('params').htmlMinifier.options
  }

  // Loop through each bundle in the allowlist of the roosevelt configs
  for (const bundleName in allowlist) {
    const bundleFilepaths = allowlist[bundleName]
    const bundleFilepathsLength = bundleFilepaths !== null ? bundleFilepaths.length : 0

    // If the list of files for a particular bundle is empty, continue to the next bundle
    if (bundleFilepathsLength === 0) {
      logger.warn(`no files listed to be outputted in bundle ${bundleName}`.yellow)
      // return
      continue
    }

    // Load in each template for each bundle
    for (const file of bundleFilepaths) {
      fileName = file
      const fileNameAndPath = path.join(viewsPath, file)

      try {
        if (fse.lstatSync(fileNameAndPath).isDirectory()) {
          exposeDirectory(fileNameAndPath, bundleName, 'allowlist')
        } else {
          contents = fse.readFileSync(fileNameAndPath, 'utf8').trim()
          filesCache.push(fileNameAndPath)
        }
      } catch (error) {
        // File may not exist. Log such error
        logger.error(error)
      }

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, bundleName, 'allowlist')
      } catch (error) {
        // Error is thrown when template contains <!-- roosevelt-blocklist -->. Skip this template
        logger.error(error)
        continue
      }

      // Add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }

  if (exposeAll) {
    exposeDirectory(viewsPath, defaultBundle, 'exposeAll')
  }

  // Loop through each bundle, preprocess it, and save it to the specified location on the filesystem
  for (const bundleFilename in outputBundles) {
    saveBundle(outputBundles[bundleFilename], bundleFilename)
  }

  /* ======== Internal Functions ======== */

  function parseTemplateComment (templateComment, contents, bundleName, locationMethod) {
    let bundleLocation

    if (templateComment.includes('roosevelt-blocklist')) {
      // If the template is blocklisted, throw an error and skip this
      throw Error(`This item was tried to be exposed in the ${locationMethod} method, but included a <!-- roosevelt-blocklist --> tag and will not be exposed`)
    } else if (templateComment.includes('roosevelt-allowlist')) {
      // If it is allowlisted, remove the tag from the contents and set the bundle location to the string found with the regex
      contents = contents.split('\n').slice(1).join('\n')

      bundleLocation = regex.exec(templateComment)[1]
      regex.lastIndex = 0
    } else {
      // Otherwise, save it to a default bundle
      bundleLocation = bundleName
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
    const filePathArr = filePath.split(path.sep)
    const basePathArr = basePath.split(path.sep)
    const basePathLen = basePathArr.length

    const retStrArr = []

    for (let i = 0; i < filePathArr.length; i++) {
      // push the current section of the filePathArr as long as it either differs from the basePathArr or the index is greater than the length of the basePathArr
      if (i >= basePathLen || filePathArr[i] !== basePathArr[i]) {
        retStrArr.push(filePathArr[i])
      }
    }

    return retStrArr.join(path.sep)
  }

  function saveBundle (bundle, filename) {
    let fileData
    const writePath = path.join(basePath, filename)

    for (const tempFilename in bundle) {
      bundle[tempFilename] = preprocess(bundle[tempFilename], tempFilename)
    }

    fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'

    fileData += `module.exports = ${JSON.stringify(bundle)}`

    // save the file
    fsr.writeFileSync(writePath, fileData, ['📝', `${appName} writing new JS file ${writePath}`.green])
  }

  function preprocess (file, name) {
    const { onClientViewsProcess } = app.get('params')

    // if the onClientViewsProcess event is defined, pass the current file through it
    if (onClientViewsProcess && typeof onClientViewsProcess === 'function') {
      file = onClientViewsProcess(file)
    }

    // minify the file if the option is turned on (and it is not a pug file since pug can't really be minified)
    if (willMinifyTemplates && path.extname(name) !== 'pug' && file.length > 0) {
      file = htmlMinifier(file, minifyOptions)
    }

    return file
  }

  // Returns an array of all valid file paths in the given directory.
  function exposeDirectory (directory, bundleName, locationMethod) {
    // Use klaw to find all files in the given path except ones that are part of the blocklist param of the clientViews property in the Roosevelt config
    const blocklistPaths = blocklist.map(blocklistItem => path.join(viewsPath, blocklistItem))
    const allFilePaths = klaw(directory, { filter: item => !blocklistPaths.includes(item.path), nodir: true }).map(file => file.path)

    const excludedFiles = gitignoreScanner(allFilePaths)
    for (const filePath of allFilePaths) {
      // exclude system files from being harvested
      const parts = filePath.split('/')
      const justFileName = parts[parts.length - 1]
      if (excludedFiles.includes(justFileName)) {
        continue
      }

      if (filesCache.includes(filePath)) {
        logger.log('💭', 'file already exposed. continuing...'.bold)
        continue
      }

      // The filePath object is the absolute path of the file. Delete the viewsPath portion from the filePath
      fileName = removeBasePath(filePath, viewsPath)

      contents = fse.readFileSync(filePath, 'utf8').trim()
      filesCache.push(filePath)

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, bundleName, locationMethod)
      } catch (error) {
        // Error is thrown when template contains <!-- roosevelt-blocklist -->. Skip this template
        logger.error(error)
        continue
      }

      // Add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }
}
