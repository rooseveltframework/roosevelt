// cleanup symlinks and generated files in roosevelt apps

require('colors')

const appDir = process.cwd()
const fsr = require('../tools/fsr')()
const Logger = require('roosevelt-logger')
const logger = new Logger()
const fse = require('fs-extra')
const readline = require('readline')
const path = require('path')
const pkg = require(path.join(appDir, 'package.json'))
const appName = pkg.name || 'Roosevelt Express'
const params = pkg.rooseveltConfig
const statics = params.staticsRoot
const jsPath = params.js.sourcePath
const publicDir = path.join(appDir, params.publicFolder)
const compiledJsDir = path.join(appDir, statics, params.js.output.split(path.sep)[0] || params.js.output)
const compiledCssDir = path.join(appDir, statics, params.css.output.split(path.sep)[0] || params.css.output)
const bundledJsDir = path.join(appDir, statics, jsPath, params.js.bundler.output)
const cleanupDirs = []
let rl

logger.info('🛁', `Cleaning up ${appName}...`.bold)

// check for public directory
if (fsr.fileExists(publicDir)) {
  cleanupDirs.push(publicDir)
  logger.info('🔦', `Found directory: ${publicDir}`)
}

// check for compiled js directory
if (fsr.fileExists(compiledJsDir)) {
  cleanupDirs.push(compiledJsDir)
  logger.info('🔦', `Found directory: ${compiledJsDir}`)
}

// check for compiled css directory (if unique)
if (compiledJsDir !== compiledCssDir) {
  if (fsr.fileExists(compiledCssDir)) {
    cleanupDirs.push(compiledCssDir)
    logger.info('🔦', `Found directory: ${compiledCssDir}`)
  }
}

// check for bundled js directory
if (bundledJsDir !== path.join(appDir, statics, jsPath)) {
  if (fsr.fileExists(bundledJsDir)) {
    cleanupDirs.push(bundledJsDir)
    logger.info('🔦', `Found directory: ${bundledJsDir}`)
  }
}

// if directories are found, prompt user before deletion
if (cleanupDirs[0]) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(`❔  Do you want to remove ${cleanupDirs[1] ? 'these directories' : 'this directory'}? [y/N]`.bold, (answer) => {
    logger.info()
    if (answer === ('y' || 'Y' || 'yes' || 'Yes')) {
      cleanupDirs.forEach(function (dir) {
        logger.info('🗑', `Removing directory: ${dir}`)
        fse.removeSync(dir)
      })
      logger.info('✅', 'Cleanup finished.'.green)
    } else {
      logger.info('🏃‍♂️ ', 'Cleanup aborted.'.bold)
    }
    rl.close()
  })
} else {
  logger.info('✅', 'Cleanup finished with no directories found.'.green)
}
