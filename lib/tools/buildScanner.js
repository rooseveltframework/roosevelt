// Module for scanning the .build directory and alerting the user when they have stale files
require('colors')
const fs = require('fs')
const path = require('path')
const klawSync = require('klaw-sync')

module.exports = function (app, callback) {
  let stale = false
  const staleFiles = []
  const jsDir = app.get('params').js.output.split('/')[0]
  const cssDir = app.get('params').css.output.split('/')[0]
  const jsBundleDir = app.get('params').js.bundler.output
  const staticsPath = path.join(app.get('appDir'), app.get('params').staticsRoot)
  const date = new Date().getTime()
  const filterFn = item => (!!item.path.match(/(.*\.build.*)(\.js|\.css)/) && ((date - item.stats.mtimeMs) > app.get('params').cleanTimer))
  const logger = app.get('logger')

  if (app.get('params').cleanTimer === null || typeof app.get('params').cleanTimer !== 'number' || app.get('params').cleanTimer === 0) {
    logger.warn('Unable to parse cleanTimer Roosevelt parameter, proceeding without stale file scanner.')
    callback()
  }

  try {
    fs.accessSync(staticsPath)
  } catch (e) {
    callback()
  }

  const unparsedStaleFiles = klawSync(staticsPath, { filter: filterFn, nodir: true, traverseAll: true })
  unparsedStaleFiles.forEach((file) => {
    file = file.path
    if (file.includes(jsDir) || file.includes(cssDir) || file.includes(jsBundleDir)) {
      stale = true
      staleFiles.push(file)
    }
  })

  if (stale) {
    staleFiles[0] = '      ' + staleFiles[0]
    const fileList = staleFiles.join('\n      ')
    logger.warn(`There are stale files in one or more your CSS or JS output directories. You may want to run \`npm run clean\`.\n    Stale files:\n${fileList}`)
    callback()
  } else {
    callback()
  }
}
