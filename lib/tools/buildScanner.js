// Module for scanning the .build directory and alerting the user when they have stale files
require('colors')
const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')

module.exports = function (app, callback) {
  const logger = require('./logger')(app.get('params').logging)
  let jsBuildFiles
  let cssBuildFiles
  let buildFiles
  let jsDir = app.get('params').js.output.split('/')[0]
  let cssDir = app.get('params').css.output.split('/')[0]
  let stale = false
  let jsBuildPath = path.join(path.join(app.get('appDir'), app.get('params').staticsRoot), jsDir)
  let cssBuildPath = path.join(path.join(app.get('appDir'), app.get('params').staticsRoot), cssDir)
  let staleFiles = []
  let scannedFiles = []

  if (app.get('params').cleanTimer === null || typeof app.get('params').cleanTimer !== 'number' || app.get('params').cleanTimer === 0) {
    callback()
  }

  try {
    // make sure we can access the .build directory
    fs.accessSync(jsBuildPath)
    fs.accessSync(cssBuildPath)
  } catch (e) {
    callback()
  }

  jsBuildFiles = klawSync(jsBuildPath, {nodir: true})
  cssBuildFiles = klawSync(cssBuildPath, {nodir: true})

  // concatonate the arrays containing the JS and CSS files
  buildFiles = jsBuildFiles.concat(cssBuildFiles)

  // find the date for each of these files and compare to current date
  // if the difference is greater than the user configured time (default: 1 week), we will warn the user about a stale file.
  buildFiles.forEach((file) => {
    file = file.path
    if (!scannedFiles.includes(file)) {
      let dateAccessed = new Date(fs.statSync(file).mtimeMs)
      let currentTime = new Date().getTime()
      let date = new Date(currentTime)
      let difference = date - dateAccessed
      if (difference >= app.get('params').cleanTimer) {
        stale = true
        staleFiles.push(file)
      }
      scannedFiles.push(file)
    }
  })
  if (stale) {
    logger.warn(`There are stale file(s) in ${jsDir}  ||  ${cssDir}. You may want to run npm run clean.\nStale Files:\n`.yellow, `${staleFiles}`)
    callback()
  } else {
    callback()
  }
}
