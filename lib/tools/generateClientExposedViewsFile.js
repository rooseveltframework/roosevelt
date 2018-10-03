/**
 * Grabs view template files from a whitelist, saves these into a JS file (staticsRoot/.build/templates/clientExposedViews.js). The saved file can later be required in client
 * side js, and bundled to allow for sharing of views between client and server.
 */
module.exports = function (app) {
  const fse = require('fs-extra')
  const path = require('path')
  const templates = {}
  let fileData
  let item
  let fileNameAndPath
  let fileName
  let contents
  let appName = app.get('appName')
  let appDir = app.get('appDir')
  let viewsPath = app.get('viewsPath')
  let staticsRoot = app.get('staticsRoot')
  let whitelist = app.get('sharedTemplateFiles')
  let whitelistLength = whitelist !== undefined && whitelist !== null ? whitelist.length : 0
  let basePath = path.join(appDir, staticsRoot, '.build/templates')
  let writePath = path.join(basePath, 'clientExposedViews.js')
  let i

  // If there are no entries in the whitelist, return
  if (whitelistLength === 0) {
    return
  }

  for (i = 0; i < whitelistLength; i++) {
    item = whitelist[i]
    fileNameAndPath = path.join(viewsPath + '/' + item)
    fileName = item

    // Add .html extension if it is not present
    if (path.extname(item) === '') {
      fileNameAndPath = fileNameAndPath + '.html'
      fileName = fileName + '.html'
    }

    try {
      contents = fse.readFileSync(fileNameAndPath, 'utf8').trim()
    } catch (e) {
      console.error(e)
    }

    templates[fileName] = contents
  }

  try {
    fse.accessSync(basePath)
  } catch (e) {
    console.log('📁  ' + ('Roosevelt making new directory ' + basePath).warn)
    fse.ensureDirSync(basePath)
  }

  fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'

  fileData += 'module.exports = function() {\n  return ' + JSON.stringify(templates) + '\n}\n'

  console.log('📝' + '  ' + (appName + ' writing new JS file ' + writePath).success)

  fse.writeFileSync(writePath, fileData, 'utf8')
}
