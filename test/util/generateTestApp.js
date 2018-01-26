// generate app.js and deposit it into test/app

const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = function (params, method) {
  const appDir = params.appDir
  let appJSContents = `const app = require('../../../roosevelt')(${util.inspect(params, {depth: 5})})\n\n`
  let defaultMessages = 'process.send(app.expressApp.get(\'params\'))'

  if (method) {
    appJSContents += `app.${method}(() => {\n`
    appJSContents += `  ${defaultMessages}\n})`
  } else {
    appJSContents += defaultMessages
  }

  // generate test app drectory
  fse.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), appJSContents)
}
