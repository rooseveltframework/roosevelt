// cleanup symlinks and generated files in roosevelt apps

const appDir = require('./getAppDir')
const fileExists = require('./fileExists')
const rimraf = require('rimraf')
const readline = require('readline')
const path = require('path')
const pkg = require(path.join(appDir, 'package.json'))
const appName = pkg.name || 'Roosevelt'
const params = pkg.rooseveltConfig
const statics = params.staticsRoot
const jsPath = params.jsPath
const publicDir = path.join(appDir, params.publicFolder)
const compiledJsDir = path.join(appDir, statics, params.jsCompiledOutput.split(path.sep)[0] || params.jsCompiledOutput)
const compiledCssDir = path.join(appDir, statics, params.cssCompiledOutput.split(path.sep)[0] || params.cssCompiledOutput)
const bundledJsDir = path.join(appDir, statics, jsPath, params.bundledJsPath)
let cleanupDirs = []
let rl

console.log(`🛁  Cleaning up ${appName}...`.bold)

// check for public directory
if (fileExists(publicDir)) {
  cleanupDirs.push(publicDir)
  console.log(`🔦  Found directory: ${publicDir}`)
}

// check for compiled js directory
if (fileExists(compiledJsDir)) {
  cleanupDirs.push(compiledJsDir)
  console.log(`🔦  Found directory: ${compiledJsDir}`)
}

// check for compiled css directory (if unique)
if (compiledJsDir !== compiledCssDir) {
  if (fileExists(compiledCssDir)) {
    cleanupDirs.push(compiledCssDir)
    console.log(`🔦  Found directory: ${compiledCssDir}`)
  }
}

// check for bundled js directory
if (bundledJsDir !== path.join(appDir, statics, jsPath)) {
  if (fileExists(bundledJsDir)) {
    cleanupDirs.push(bundledJsDir)
    console.log(`🔦  Found directory: ${bundledJsDir}`)
  }
}

// if directories are found, prompt user before deletion
if (cleanupDirs[0]) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(`❔  Do you want to remove ${cleanupDirs[1] ? 'these directories' : 'this directory'}? [y/N]`.bold, (answer) => {
    if (answer === ('y' || 'Y' || 'yes' || 'Yes')) {
      cleanupDirs.forEach(function (dir) {
        console.log(`🗑  Removing directory: ${dir}`)
        rimraf.sync(dir)
      })
    }
    rl.close()
    console.log('✔️  Cleanup finished.'.bold)
  })
} else {
  console.log('✔️  Cleanup finished.'.bold)
}
