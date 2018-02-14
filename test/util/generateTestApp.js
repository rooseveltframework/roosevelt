// generate app.js and deposit it into test/app

const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = function (params, options) {
  const appDir = params.appDir
  let appJSContents = `const app = require(\`${options.rooseveltPath}\`)(${util.inspect(params, {depth: 5})})\n\n`
  let defaultMessages = 'process.send(app.expressApp.get(\'params\'))'

  if (options.method === 'initServer') {
    appJSContents += `app.${options.method}(() => {\n`
    appJSContents += `  ${defaultMessages}\n})`
  } else if (options.method === 'startServer') {
    appJSContents = appJSContents.replace('onServerStart: true', 'onServerStart: (app) => {process.send(app.get(\'params\'))}')
    appJSContents += `app.${options.method}()`
  } else {
    appJSContents += defaultMessages
  }

  // generate test app drectory
  fse.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), appJSContents)
}
