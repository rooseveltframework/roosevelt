// expose templates that are available on the server down to the client as well
require('@colors/colors')
const fse = require('fs-extra')
const path = require('path')
const klaw = require('klaw-sync')
const gitignoreScanner = require('./tools/gitignoreScanner')
const htmlMinifier = require('html-minifier-terser').minify

module.exports = async app => {
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')
  const appName = app.get('appName')
  const viewsPath = app.get('viewsPath')
  const { minify: willMinifyTemplates, exposeAll, allowlist, blocklist, defaultBundle } = app.get('params').clientViews
  let minifyOptions = app.get('params').clientViews.minifyOptions

  // if the clientViews minifyOptions is empty, default back to the html.minifier options
  if (Object.keys(minifyOptions).length === 0) minifyOptions = app.get('params').html.minifier.options

  // loop through each bundle in the allowlist of the roosevelt configs
  const outputBundles = {}
  const filesCache = [] // list of filepaths that have been already read
  let templateComment
  let fileName
  let contents
  let bundleLocation
  for (const bundleName in allowlist) {
    const bundleFilepaths = allowlist[bundleName]
    const bundleFilepathsLength = bundleFilepaths !== null ? bundleFilepaths.length : 0

    // if the list of files for a particular bundle is empty, continue to the next bundle
    if (bundleFilepathsLength === 0) {
      logger.warn(`no files listed to be outputted in bundle ${bundleName}`.yellow)
      continue
    }

    // load in each template for each bundle
    for (let file of bundleFilepaths) {
      if (file.includes('*')) {
        file = file.substring(0, file.length - 1)
        if (file[file.length - 1] !== '/') {
          fse.readdirSync(viewsPath).forEach(content => {
            if (content.startsWith(file)) {
              file = content
            }
          })
        }
      }
      fileName = file
      const fileNameAndPath = path.join(viewsPath, file)

      try {
        if (fse.lstatSync(fileNameAndPath).isDirectory()) {
          getAllValidFilePaths(fileNameAndPath, bundleName, 'allowlist')
        } else {
          contents = fse.readFileSync(fileNameAndPath, 'utf8').trim()
          filesCache.push(fileNameAndPath)
        }
      } catch (error) {
        // file may not exist; log such error
        logger.error(error)
      }

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, bundleName, 'allowlist')
      } catch (error) {
        // error is thrown when template contains <!-- roosevelt-blocklist -->; skip this template
        logger.error(error)
        continue
      }

      // add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }

  if (exposeAll) getAllValidFilePaths(viewsPath, defaultBundle, 'exposeAll')

  // returns an array of all valid file paths in the given directory
  function getAllValidFilePaths (directory, bundleName, locationMethod) {
    // check for any wildcards in blocklist
    for (let file of blocklist) {
      if (file.includes('*')) {
        // remove wildcard from blocklist
        const index = blocklist.indexOf(file)
        blocklist.splice(index, 1)
        // add files from wildcard to blocklist
        file = file.substring(0, file.length - 1)
        if (file[file.length - 1] !== '/') {
          fse.readdirSync(viewsPath).forEach(content => {
            if (content.startsWith(file)) {
              file = content
            }
          })
        }
        const fileNameAndPath = path.join(viewsPath, file)
        if (fse.lstatSync(fileNameAndPath).isDirectory()) {
          fse.readdirSync(fileNameAndPath).forEach(content => {
            if (file[file.length - 1] !== '/') {
              const fileName = file + '/' + content
              blocklist.push(fileName)
            } else {
              const fileName = file + content
              blocklist.push(fileName)
            }
          })
        } else {
          blocklist.push(file)
        }
      }
    }

    // use klaw to find all files in the given path except ones that are part of the blocklist param of the clientViews property in the roosevelt config
    const blocklistPaths = blocklist.map(blocklistItem => path.join(viewsPath, blocklistItem))
    const allFilePaths = klaw(directory, { filter: item => !blocklistPaths.includes(item.path), nodir: true }).map(file => file.path)

    const excludedFiles = gitignoreScanner(allFilePaths)
    for (const filePath of allFilePaths) {
      // exclude system files from being harvested
      const parts = filePath.split('/')
      const justFileName = parts[parts.length - 1]
      if (excludedFiles.includes(justFileName)) continue
      if (filesCache.includes(filePath)) continue

      // the filePath object is the absolute path of the file. delete the viewsPath portion from the filePath
      const filePathArr = filePath.split(path.sep)
      const basePathArr = viewsPath.split(path.sep)
      const basePathLen = basePathArr.length

      // push the current section of the filePathArr as long as it either differs from the basePathArr or the index is greater than the length of the basePathArr
      const retStrArr = []
      for (let i = 0; i < filePathArr.length; i++) {
        if (i >= basePathLen || filePathArr[i] !== basePathArr[i]) {
          retStrArr.push(filePathArr[i])
        }
      }
      fileName = retStrArr.join(path.sep)

      contents = fse.readFileSync(filePath, 'utf8').trim()
      filesCache.push(filePath)

      templateComment = contents.split('\n')[0]

      try {
        [bundleLocation, contents] = parseTemplateComment(templateComment, contents, bundleName, locationMethod)
      } catch (error) {
        // error is thrown when template contains <!-- roosevelt-blocklist -->; skip this template
        logger.error(error)
        continue
      }

      // add the template to the outputBundles object
      storeContents(contents, bundleLocation, fileName)
    }
  }

  function parseTemplateComment (templateComment, contents, bundleName, locationMethod) {
    const regex = /<!--+\s*roosevelt-allowlist\s*([\w-/.]+\.?(js)?)\s*--+>/g // regular expression to grab filename from <!-- roosevelt-allowlist --> tags
    let bundleLocation
    if (templateComment.includes('roosevelt-blocklist')) {
      // if the template is blocklisted, throw an error and skip this
      throw Error(`This item was tried to be exposed in the ${locationMethod} method, but included a <!-- roosevelt-blocklist --> tag and will not be exposed`)
    } else if (templateComment.includes('roosevelt-allowlist')) {
      // if it is allowlisted, remove the tag from the contents and set the bundle location to the string found with the regex
      contents = contents.split('\n').slice(1).join('\n')
      bundleLocation = regex.exec(templateComment)[1]
      regex.lastIndex = 0
    } else {
      // otherwise, save it to a default bundle
      bundleLocation = bundleName
    }
    return [bundleLocation, contents]
  }

  function storeContents (contents, bundleLocation, fileName) {
    // if the bundle doesn't exist in the outputBundles object yet, initialize an empty object
    if (outputBundles[bundleLocation] === null || outputBundles[bundleLocation] === undefined) {
      outputBundles[bundleLocation] = {}
    }
    outputBundles[bundleLocation][fileName] = contents
  }

  // loop through each bundle, preprocess it, and save it to the specified location on the filesystem
  const { onClientViewsProcess } = app.get('params')
  for (const bundleFilename in outputBundles) {
    const bundle = outputBundles[bundleFilename]
    const filename = bundleFilename
    let fileData
    const newBundle = {}
    const writePath = path.join(app.get('clientViewsBundledOutput'), filename)

    for (const tempFilename in bundle) {
      let bundleFileName = tempFilename

      // if the view's file extension matches the default view engine's file extension, then remove file extension from the bundle object key
      if (tempFilename.substring(tempFilename.length - app.get('view engine').length - 1, tempFilename.length) === '.' + app.get('view engine')) {
        bundleFileName = tempFilename.substring(0, tempFilename.length - app.get('view engine').length - 1)
      }

      // if the onClientViewsProcess event is defined, pass the current file through it
      if (onClientViewsProcess && typeof onClientViewsProcess === 'function') {
        bundle[tempFilename] = onClientViewsProcess(bundle[tempFilename])
      }

      // minify the file if the option is turned on (and it is not a pug file since pug can't really be minified)
      if (willMinifyTemplates && path.extname(tempFilename) !== 'pug' && bundle[tempFilename].length > 0) {
        bundle[tempFilename] = await htmlMinifier(bundle[tempFilename], minifyOptions)
      }

      newBundle[bundleFileName] = bundle[tempFilename]
    }

    fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'
    fileData += `module.exports = ${JSON.stringify(newBundle)}`
    fsr.writeFileSync(writePath, fileData, ['📝', `${appName} writing new JS file ${writePath}`.green])
  }
}
