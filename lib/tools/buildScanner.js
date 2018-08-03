// Module for scanning the .build directory and alerting the user when they have stale files
const fs = require('fs')
const path = require('path')

module.exports = function (buildPath) {
  let buildFiles
  let stale = false

  var walkSync = function (dir, filelist) {
    var files = fs.readdirSync(dir)
    filelist = filelist || []
    files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = walkSync(path.join(dir, file), filelist)
      } else {
        filelist.push(path.join(dir, file))
      }
    })
    return filelist
  }

  try {
    // make sure we can access the .build directory
    fs.accessSync(buildPath)
  } catch (e) {
    console.log('Couldn\'t access the build directory.')
  }
  // call to recursive walkSync to grab file names
  buildFiles = walkSync(buildPath)

  // find the date for each of these files and compare to current date
  // if the difference is greater than 604800000ms (a week), we will warn the user about a stale file.
  buildFiles.forEach((file) => {
    let dateAccessed = new Date(fs.statSync(file).mtimeMs)
    let currentTime = new Date().getTime()
    let date = new Date(currentTime)
    let difference = date - dateAccessed
    if (difference >= 604800000) {
      stale = true
    }
  })
  return stale
}
