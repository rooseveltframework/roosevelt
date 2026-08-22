require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')

module.exports = app => {
  const params = app.get('params')
  const appName = app.get('appName')
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')
  const buildCache = app.get('buildCache')

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
        // then skip the copy entirely if nothing on either side has changed since the last run
        const sources = filesIn(source)
        if (buildCache.isFresh(dest, sources)) continue

        try {
          fs.copySync(source, dest)
          buildCache.record(dest, { outputs: filesIn(dest), sources })
          logger.info('📁', `${appName} copying `.cyan + `${source}`.yellow + ' to '.cyan + `${dest}`.yellow)
        } catch (e) {
          // the copy may have got partway through, so what is there now cannot be trusted
          buildCache.forget(dest)
          logger.error(`Error copying ${source} to ${dest}: ${e.message}`)
        }
      } else {
        logger.error(`Copy source "${source}" does not exist. Skipping copy.`)
      }
    }
  } else {
    // a log is printed here by generateSymlinks.js so we don't need to do it twice
  }

  // the build cache works in terms of files, so a copy of a whole directory is described by everything inside it
  function filesIn (fileOrFolder) {
    try {
      return fs.statSync(fileOrFolder).isDirectory() ? fsr.getAllFilesRecursivelySync(fileOrFolder) : [fileOrFolder]
    } catch {
      // an unreadable path leaves nothing to compare against, which the cache treats as a reason to copy again rather than skip
      return []
    }
  }
}
