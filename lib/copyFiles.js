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

    // the destinations of the copies whose source still exists, so that the files roosevelt copied for one that is gone, or no longer configured, can be removed below
    const live = []

    // copy files
    for (const fileOrFolder of params.copy) {
      // append appDir to each path that is relative
      const source = path.isAbsolute(fileOrFolder.source) ? fileOrFolder.source : path.join(app.get('appDir'), fileOrFolder.source)
      const dest = path.isAbsolute(fileOrFolder.dest) ? fileOrFolder.dest : path.join(app.get('appDir'), fileOrFolder.dest)

      // first ensure the source exists
      if (fs.pathExistsSync(source)) {
        live.push(dest)

        // then skip the copy entirely if nothing on either side has changed since the last run
        const sources = filesIn(source)
        if (buildCache.isFresh(dest, sources)) continue

        try {
          fs.copySync(source, dest)

          // the outputs are the copies of the source files rather than everything in the destination, since the destination can be a folder other things are written to as well, such as the public folder, and only what roosevelt copied there is roosevelt's to remove
          const outputs = fs.statSync(source).isDirectory() ? sources.map(file => path.join(dest, path.relative(source, file))) : [dest]

          // a file deleted from the source since the last copy is deleted from the destination too, as copying does not do that by itself
          buildCache.removeOutputs(dest, outputs, dest)
          buildCache.record(dest, { outputs, sources, group: 'copy' })
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

    // remove what was copied for a source that no longer exists
    buildCache.prune('copy', live)
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
