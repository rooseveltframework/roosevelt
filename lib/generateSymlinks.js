const fs = require('fs-extra')
const path = require('path')
const process = require('process')

module.exports = app => {
  const params = app.get('params')
  const appName = app.get('appName')
  const fsr = require('./tools/fsr')(app)
  const logger = app.get('logger')

  // process symlinks
  if (params.makeBuildArtifacts) {
    // test that symlink creation works in general; fixes https://github.com/rooseveltframework/roosevelt/issues/1484
    const source = 'package.json'
    const dest = 'testIfSymlinksWork'
    try {
      if (process.platform === 'win32') {
        fs.ensureLinkSync(source, dest)
      } else {
        fs.ensureSymlinkSync(source, dest, 'junction')
      }
      fs.rmSync('testIfSymlinksWork')
    } catch (e) {
      logger.error('Unable to create symlinks. Please ensure you are using a file system that supports symlinks and you have the proper permissions to make them.')
    }

    // generate public and statics directories
    fsr.ensureDirSync(params.buildFolder)
    fsr.ensureDirSync(params.publicFolder)
    fsr.ensureDirSync(params.staticsRoot)

    // remove broken symlinks
    const publicFiles = fsr.getAllFilesRecursivelySync(params.publicFolder)
    for (const file of publicFiles) {
      if (fs.lstatSync(file).isSymbolicLink()) {
        try {
          const targetPath = fs.readlinkSync(file)
          if (!fs.existsSync(path.resolve(path.dirname(file), targetPath))) fs.rmSync(file) // remove broken symlink
        } catch (err) {
          fs.rmSync(file) // remove broken symlink
        }
      }
    }

    // make symlinks
    for (const symlink of params.symlinks) {
      // append appDir to each path that is relative
      const source = path.isAbsolute(symlink.source) ? symlink.source : path.join(app.get('appDir'), symlink.source)
      const dest = path.isAbsolute(symlink.dest) ? symlink.dest : path.join(app.get('appDir'), symlink.dest)

      // first ensure the source exists
      if (fs.pathExistsSync(source)) {
        // then check if the destination already exists
        if (fs.pathExistsSync(dest)) {
          if (fs.lstatSync(dest).isSymbolicLink()) {
            continue // symlink exists, skip making it
          } else {
            logger.error(`Symlink destination "${dest}" is already a file that exists. Skipping symlink creation.`)
            continue
          }
        }
        try {
          if (process.platform === 'win32' && !fs.lstatSync(source).isDirectory()) {
            fs.ensureLinkSync(source, dest)
          } else {
            fs.ensureSymlinkSync(source, dest, 'junction')
          }
          logger.info('📁', `${appName} making new symlink `.cyan + `${dest}`.yellow + (' pointing to ').cyan + `${source}`.yellow)
        } catch (e) {
          logger.error('It appears your Roosevelt app has been moved/renamed. You may want to delete the "./public" folder to remove the broken symlinks.')
        }
      } else {
        logger.error(`Symlink source "${source}" does not exist. Skipping symlink creation.`)
      }
    }
  } else {
    logger.warn('💡', `${appName} will not generate build artifacts like symlinks, compiled/bundled CSS/JS files, etc because the makeBuildArtifacts parameter is set to false. See Roosevelt API docs for more information about the makeBuildArtifacts parameter.`)
  }
}
