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
    appJSContents = appJSContents.replace('onServerStart: true', 'onServerStart: (app) => {process.send("ServerStart")}')
    // check to see if and what param function was added to the parameters
    if (appJSContents.includes('onReqStart: true')) {
      appJSContents = appJSContents.replace('onReqStart: true', `onReqStart: (req, res, next) => {res.setHeader('onreqStartTest','true')\nnext()}`)
    } else if (appJSContents.includes('onReqBeforeRoute: true')) {
      appJSContents = appJSContents.replace('onReqBeforeRoute: true', `onReqBeforeRoute: (req, res, next) => {res.setHeader('onreqBeforeRoute','true')\nnext()}`)
    } else if (appJSContents.includes('onReqAfterRoute: true')) {
      appJSContents = appJSContents.replace('onReqAfterRoute: true', `onReqAfterRoute: (req, res) => {process.send("onReqAfterRoute")}`)
    }
    appJSContents += `app.${options.method}()`
  } else {
    appJSContents += defaultMessages
  }

  // generate test app drectory
  fse.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), appJSContents)
}
