// generate app.js and deposit it into test/app

const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = function (params, options) {
  let appDir
  if (params === undefined) {
    appDir = options.appDir
  } else {
    appDir = params.appDir || options.appDir
  }
  let appJSContents = `const app = require(\`${options.rooseveltPath}\`)(${util.inspect(params, {depth: null})})\n\n`
  let defaultMessages = 'process.send(app.expressApp.get(\'params\'))'
  appJSContents = appJSContents.replace(/('\()/g, '(')
  appJSContents = appJSContents.replace(/(\}')/g, '}')

  if (options.method) {
    if (!options.empty && !options.noFunction && !options.initStart && !options.initTwice) {
      appJSContents += `app.${options.method}(() => {\n`
      appJSContents += `  ${defaultMessages}\n})`
    } else if (options.empty && !options.noFunction && !options.initStart && !options.initTwice) {
      appJSContents += `app.${options.method}()`
    } else if (!options.empty && options.noFunction && !options.initStart && !options.initTwice) {
      appJSContents += `app.${options.method}('something')`
    } else if (!options.empty && !options.noFunction && options.initStart && !options.initTwice) {
      appJSContents += `app.initServer()\n`
      appJSContents += `app.startServer(() => {\n`
      appJSContents += `${defaultMessages}\n})`
    } else if (!options.empty && !options.noFunction && !options.initStart && options.initTwice) {
      appJSContents += `app.initServer()\n`
      appJSContents += `app.initServer(() => {\n`
      appJSContents += `${defaultMessages}\n})`
    }
  } else {
    appJSContents += defaultMessages
  }

  // generate test app drectory
  fse.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), appJSContents)
}
