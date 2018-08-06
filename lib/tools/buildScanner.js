// Module for scanning the .build directory and alerting the user when they have stale files
const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')

module.exports = function (app) {
  const logger = require('./logger')(app.get('params').logging)
  let buildFiles
  let compDir = app.get('params').js.output.split('/')[0]
  let stale = false
  let buildPath = path.join(path.join(app.get('appDir'), app.get('params').staticsRoot), compDir)

  try {
    // make sure we can access the .build directory
    fs.accessSync(buildPath)
  } catch (e) {
    return
  }

  buildFiles = klawSync(buildPath, {nodir: true})

  // find the date for each of these files and compare to current date
  // if the difference is greater than 604800000ms (a week), we will warn the user about a stale file.
  buildFiles.forEach((file) => {
    file = file.path
    let dateAccessed = new Date(fs.statSync(file).mtimeMs)
    let currentTime = new Date().getTime()
    let date = new Date(currentTime)
    let difference = date - dateAccessed
    if (difference >= 604800000) {
      stale = true
    }
  })
  if (stale) {
    logger.warn(`You have stale file(s) in your ${compDir} directory. You may want to run npm run clean.`)
  }
}
