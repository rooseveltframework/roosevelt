const fs = require('fs-extra')
const path = require('path')
const process = require('process')

module.exports = app => {
  const params = app.get('params')
  const appName = app.get('appName')
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')

  // generate public and statics directories
  fsr.ensureDirSync(params.publicFolder)
  fsr.ensureDirSync(params.staticsRoot)

  // process symlinks
  if (params.makeBuildArtifacts) {
    for (const symlink of params.symlinks) {
      // append appDir to each path that is relative
      const source = path.isAbsolute(symlink.source) ? symlink.source : path.join(app.get('appDir'), symlink.source)
      const dest = path.isAbsolute(symlink.dest) ? symlink.dest : path.join(app.get('appDir'), symlink.dest)

      // first ensure the source exists
      if (fsr.fileExists(source)) {
        // then check if the destination already exists
        if (fsr.fileExists(dest)) {
          // then check if the destination is a symlink
          if (!fs.lstatSync(dest).isSymbolicLink()) {
            logger.error(`Symlink destination "${dest}" is already a file that exists. Skipping symlink creation.`)
          }
        } else {
          try {
            if (process.platform === 'win32' && !fs.lstatSync(source).isDirectory()) {
              fs.ensureLinkSync(source, dest)
            } else {
              fs.ensureSymlinkSync(source, dest, 'junction')
            }
            logger.info('📁', `${appName} making new symlink `.cyan + `${dest}`.yellow + (' pointing to ').cyan + `${source}`.yellow)
          } catch (e) {
            logger.error('It appears your Roosevelt app has been moved/renamed. You may want to delete the `./public` folder to remove the broken symlinks.')
          }
        }
      } else {
        logger.error(`Symlink source "${source}" does not exist. Skipping symlink creation.`)
      }
    }
  } else {
    logger.log('💡', `${appName} will not generate build artifacts like symlinks, compiled/bundled CSS/JS files, etc because the makeBuildArtifacts parameter is set to false. See Roosevelt API docs for more information about the makeBuildArtifacts parameter.`)
  }
}
