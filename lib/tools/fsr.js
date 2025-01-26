// internal Roosevelt file system module

const fs = require('fs-extra')
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
    ensureDirSync,
    writeFileSync
  }
}

module.exports = fsr
