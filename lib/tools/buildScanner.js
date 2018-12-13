// Module for scanning the .build directory and alerting the user when they have stale files
require('colors')
const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')
const logger = require('./logger')()

module.exports = function (app, callback) {
  let stale = false
  let staleFiles = []
  let jsDir = app.get('params').js.output.split('/')[0]
  let cssDir = app.get('params').css.output.split('/')[0]
  let jsBundleDir = app.get('params').js.bundler.output
  let staticsPath = path.join(app.get('appDir'), app.get('params').staticsRoot)
  let date = new Date().getTime()
  const filterFn = item => (date - item.stats.mtimeMs) > app.get('params').cleanTimer

  if (app.get('params').cleanTimer === null || typeof app.get('params').cleanTimer !== 'number' || app.get('params').cleanTimer === 0) {
    callback()
  }

  try {
    fs.accessSync(staticsPath)
  } catch (e) {
    callback()
  }

  let unparsedStaleFiles = klawSync(staticsPath, { filter: filterFn, nodir: true })
  unparsedStaleFiles.forEach((file) => {
    file = file.path
    if (file.includes(jsDir) || file.includes(cssDir) || file.includes(jsBundleDir)) {
      stale = true
      staleFiles.push(file)
    }
  })

  if (stale) {
    staleFiles[0] = '        ' + staleFiles[0]
    let fileList = staleFiles.join('\n        ')
    logger.warn(` There are stale files in one or more your CSS or JS output directories. You may want to run npm run clean.\n    Stale Files:\n${fileList}`.yellow)
    callback()
  } else {
    callback()
  }
}
