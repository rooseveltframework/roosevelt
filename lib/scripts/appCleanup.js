// cleanup symlinks and generated files in roosevelt apps

require('colors')

const appDir = process.cwd()
const fsr = require('../tools/fsr')()
const logger = require('../tools/logger')()
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
let cleanupDirs = []
let rl

logger.log('🛁', `Cleaning up ${appName}...`.bold)

// check for public directory
if (fsr.fileExists(publicDir)) {
  cleanupDirs.push(publicDir)
  logger.log('🔦', `Found directory: ${publicDir}`)
}

// check for compiled js directory
if (fsr.fileExists(compiledJsDir)) {
  cleanupDirs.push(compiledJsDir)
  logger.log('🔦', `Found directory: ${compiledJsDir}`)
}

// check for compiled css directory (if unique)
if (compiledJsDir !== compiledCssDir) {
  if (fsr.fileExists(compiledCssDir)) {
    cleanupDirs.push(compiledCssDir)
    logger.log('🔦', `Found directory: ${compiledCssDir}`)
  }
}

// check for bundled js directory
if (bundledJsDir !== path.join(appDir, statics, jsPath)) {
  if (fsr.fileExists(bundledJsDir)) {
    cleanupDirs.push(bundledJsDir)
    logger.log('🔦', `Found directory: ${bundledJsDir}`)
  }
}

// if directories are found, prompt user before deletion
if (cleanupDirs[0]) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(`❔  Do you want to remove ${cleanupDirs[1] ? 'these directories' : 'this directory'}? [y/N]`.bold, (answer) => {
    logger.log()
    if (answer === ('y' || 'Y' || 'yes' || 'Yes')) {
      cleanupDirs.forEach(function (dir) {
        logger.log('🗑', `Removing directory: ${dir}`)
        fse.removeSync(dir)
      })
      logger.log('✅', 'Cleanup finished.'.green)
    } else {
      logger.log('🏃‍♂️ ', 'Cleanup aborted.'.bold)
    }
    rl.close()
  })
} else {
  logger.log('✅', 'Cleanup finished with no directories found.'.green)
}
