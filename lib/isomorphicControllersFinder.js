require('colors')

module.exports = app => {
  const fse = require('fs-extra')
  const path = require('path')
  const klaw = require('klaw-sync')
  const fsr = require('./tools/fsr')(app)
  const appName = app.get('appName')
  const output = app.get('params').isomorphicControllers.output
  const file = app.get('params').isomorphicControllers.file

  if (file) {
    const allFilePaths = klaw(app.get('params').controllersPath)
    let fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'
    fileData += 'module.exports = function (router) {\n'
    for (const filePath of allFilePaths) {
      const contents = fse.readFileSync(filePath.path, 'utf8')
      if (contents.includes('.isoRequire(')) {
        fileData += '  require(\'' + filePath.path.replace(app.get('params').appDir + '/', '') + '\')(router)\n'
      }
    }
    fileData += '}'
    const writePath = path.join(output, file)
    fsr.writeFileSync(writePath, fileData, ['📝', `${appName} writing new JS file ${writePath}`.green])
  }
}
