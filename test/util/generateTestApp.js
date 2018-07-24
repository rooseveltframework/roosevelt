// generate app.js and deposit it into test/app

const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = function (params, options) {
  let appDir
  let contents = ''

  // setting the app directory
  if (params === undefined) {
    appDir = options.appDir
  } else {
    appDir = params.appDir || options.appDir
  }

  // require roosevelt at the top of every test app
  contents += `const app = require(\`${options.rooseveltPath}\`)(${util.inspect(params, {depth: null})})\n\n`
  let defaultMessages = 'process.send(app.expressApp.get(\'params\'))'
  contents = contents.replace(/('\()/g, '(')
  contents = contents.replace(/(\}')/g, '}')

  // setting up configuration for app
  if (options.method) {
    switch (true) {
      case options.empty:
        contents += `app.${options.method}()\n`
        break
      case options.noFunction:
        contents += `app.${options.method}('something')\n`
        break
      case options.initStart:
        contents += `app.initServer()\n`
        contents += `app.startServer(() => {\n`
        contents += `${defaultMessages}\n})\n`
        break
      case options.initTwice:
        contents += `app.initServer()\n`
        contents += `app.initServer(() => {\n`
        contents += `${defaultMessages}\n})\n`
        break
      case options.startTwice:
        contents += `app.startServer()\n`
        contents += `app.startServer(() => {\n`
        contents += `${defaultMessages}\n})\n`
        break
      case options.msgEnabled:
        contents += `app.${options.method}(() => {\n`
        contents += `  ${defaultMessages}\n})\n`
        contents += `const sinon = require('sinon')\n`
        contents += `let config = {shouldAdvanceTime: true}\n`
        contents += `let clock = sinon.useFakeTimers(config)\n`
        contents += `\nprocess.on('message', function (){\n`
        contents += `console.log('msg recieved')\n`
        contents += `clock.tick(30000)\n`
        contents += `})\n`
        break
      case options.exitProcess:
        contents += `app.${options.method}(() => {\n`
        contents += `  ${defaultMessages}\n})\n`
        contents += `app.${options.serverType}.on('close', function () {\n`
        contents += `  process.exit()\n`
        contents += `})\n`
        break
      default:
        contents += `app.${options.method}(() => {\n`
        contents += `  ${defaultMessages}\n})\n`
    }
    // server can be stopped by passing a message to the child process
    if (options.stopServer) {
      options.close = options.close || ''
      contents += `\nprocess.on('message', (msg) => {\n`
      contents += `  if (msg === 'stop') {\n`
      contents += `    app.stopServer('${options.close}')\n`
      contents += `  }\n})\n`
    }
  } else {
    contents += defaultMessages
  }

  // generate test app drectory
  fse.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), contents)
}
