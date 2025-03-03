// internal Roosevelt file system module

const fs = require('fs-extra')
const path = require('path')
const Logger = require('roosevelt-logger')

// writing files and folders is routed through this module so that if the user disables makeBuildArtifacts, the file/folder writing will not occur
const fsr = function (app) {
  let generate = true
  let logger
  let appName

  if (app) {
    generate = app.get('params').makeBuildArtifacts
    logger = app.get('logger')
    appName = app.get('appName')
  } else {
    generate = true
    logger = new Logger()
    appName = 'Roosevelt Express'
  }

  function getAllFilesRecursivelySync (dir) {
    let fileList = []
    const files = fs.readdirSync(dir, { withFileTypes: true })
    files.forEach(file => {
      const filePath = path.join(dir, file.name)
      if (file.isDirectory()) fileList = fileList.concat(getAllFilesRecursivelySync(filePath)) // recurse dirs
      else fileList.push(filePath)
    })
    return fileList
  }

  function ensureDirSync (dir, log) {
    if (generate && !fs.pathExistsSync(dir)) {
      fs.ensureDirSync(dir)
      if (log) {
        logger.info(...log)
      } else {
        logger.info('📁', `${appName} making new directory ${dir}`.yellow)
      }
    }
  }

  function writeFileSync (path, contents, log) {
    if (generate) {
      fs.outputFileSync(path, contents)
      if (log) {
        logger.info(...log)
      } else {
        logger.info('📁', `${appName} making new file ${path}`.yellow)
      }
    }
  }

  return {
    getAllFilesRecursivelySync,
    ensureDirSync,
    writeFileSync
  }
}

module.exports = fsr
