const fs = require('fs-extra')
const path = require('path')

module.exports = app => {
  const params = app.get('params')
  const appName = app.get('appName')
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')

  // process copy
  if (params.makeBuildArtifacts) {
    // generate public and statics directories
    fsr.ensureDirSync(params.buildFolder)
    fsr.ensureDirSync(params.publicFolder)
    fsr.ensureDirSync(params.staticsRoot)

    // copy files
    for (const fileOrFolder of params.copy) {
      // append appDir to each path that is relative
      const source = path.isAbsolute(fileOrFolder.source) ? fileOrFolder.source : path.join(app.get('appDir'), fileOrFolder.source)
      const dest = path.isAbsolute(fileOrFolder.dest) ? fileOrFolder.dest : path.join(app.get('appDir'), fileOrFolder.dest)

      // first ensure the source exists
      if (fs.pathExistsSync(source)) {
        try {
          fs.copySync(source, dest)
          logger.info('📁', `${appName} copying `.cyan + `${source}`.yellow + ' to '.cyan + `${dest}`.yellow)
        } catch (e) {
          logger.error(`Error copying ${source} to ${dest}.`)
        }
      } else {
        logger.error(`Copy source "${source}" does not exist. Skipping copy.`)
      }
    }
  } else {
    // a log is printed here by generateSymlinks.js so we don't need to do it twice
  }
}
