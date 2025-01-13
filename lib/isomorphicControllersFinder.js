require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const { walk } = require('@nodelib/fs.walk/promises')

module.exports = async app => {
  const fsr = require('./tools/fsr')(app)
  const appName = app.get('appName')
  const output = app.get('params').isomorphicControllers.output
  const file = app.get('params').isomorphicControllers.file

  if (file) {
    let fileData = '/* Do not edit; generated automatically by Roosevelt */\n\n/* eslint-disable */\n\n'
    fileData += 'module.exports = function (router) {\n'
    for (const filePath of await walk(app.get('params').controllersPath)) {
      const contents = await fs.readFile(filePath.path, 'utf8')
      if (contents.includes('.isoRequire(')) {
        fileData += '  require(\'' + (filePath.path.replace(app.get('params').appDir + path.sep, '')).replaceAll('\\', '\\\\') + '\')(router)\n'
      }
    }
    fileData += '}'
    const writePath = path.join(output, file)
    fsr.writeFileSync(writePath, fileData, ['📝', `${appName} writing new JS file ${writePath}`.green])
  }
}
