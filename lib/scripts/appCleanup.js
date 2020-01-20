// cleanup symlinks and generated files in roosevelt apps

require('colors')

const params = require('../sourceParams')({ appDir: process.cwd() })
const fsr = require('../tools/fsr')()
const fs = require('fs-extra')
const path = require('path')
const Logger = require('roosevelt-logger')
const logger = new Logger()
const readline = require('readline')
const pkg = require(path.join(params.appDir, 'package.json'))
const appName = pkg.name || 'Roosevelt Express'
const publicDir = params.publicFolder
const cleanupDirs = []
let rl

logger.info('🛁', `Cleaning up ${appName}...`.bold)

// check for public directory
if (fsr.fileExists(publicDir)) {
  cleanupDirs.push(publicDir)
  logger.info('🔦', `Found directory: ${publicDir}`)
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
        fs.removeSync(dir)
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
