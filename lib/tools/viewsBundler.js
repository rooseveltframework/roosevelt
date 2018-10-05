// Views Bundler: Module to expose views from server to be used also on the client

module.exports = function (app) {
  const fse = require('fs-extra')
  const path = require('path')
  let fileData
  let item
  let fileNameAndPath
  let fileName
  let contents
  let appName = app.get('appName')
  let appDir = app.get('appDir')
  let viewsPath = app.get('viewsPath')
  let staticsRoot = app.get('staticsRoot')
  let bundles = app.get('clientViewBundles')
  let bundlesLength = Object.keys(bundles).length
  let basePath = path.join(appDir, staticsRoot, '.build/templates')
  let writePath

  // If there are no bundles, return
  if (bundlesLength === 0) {
    return
  }

  for (let key in bundles) {
    generateBundle(key, bundles[key])
  }

  function generateBundle (key, whitelist) {
    const templates = {}
    let whitelistLength = whitelist !== null && whitelist !== undefined ? whitelist.length : 0
    let i
    writePath = path.join(basePath, key)

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
}
