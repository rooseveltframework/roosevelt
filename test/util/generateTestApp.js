// generate app.js and deposit it into test/app
// TODO: using the routing.js tests as a guide it may be possible to rip out this entire app generator concept

const fs = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = (params, options) => {
  let appDir
  let contents = '(async () => {\n'

  // setting the app directory
  if (params === undefined) {
    appDir = options.appDir
    params = {}
  } else {
    appDir = params.appDir || options.appDir
  }

  if (params.htmlValidator === undefined) {
    params.htmlValidator = {}
  }

  if (params.htmlValidator.enable !== true) {
    params.htmlValidator.enable = false
  }

  // require roosevelt at the top of every test app
  contents += `  const app = require(\`${options.rooseveltPath}\`)(${util.inspect(params, { depth: null, compact: true })})\n\n`

  // add express env to params object for testing purposes (this hacky crap is a pretty good sign we should probably refactor the tests to be better than this)
  let defaultMessages = 'let params = app.expressApp.get(\'params\')\n'
  defaultMessages += 'params[\'_env\'] = app.expressApp.get(\'env\')\n'
  defaultMessages += 'process.send(params)'

  contents = contents.replace(/('\()/g, '(')
  contents = contents.replace(/(\}')/g, '}')

  // setting up configuration for app
  if (options.method) {
    switch (true) {
      case options.empty:
        contents += `await app.${options.method}()\n`
        break
      case options.noFunction:
        contents += `await app.${options.method}('something')\n`
        break
      case options.initServer:
        contents += 'await app.initServer()\n'
        contents += 'console.log("initialized")\n'
        contents += `${defaultMessages}\n`
        break
      case options.initStart:
        contents += 'await app.initServer()\n'
        contents += 'await app.startServer()\n'
        contents += `${defaultMessages}\n`
        break
      case options.justStart:
        contents += 'await app.startServer()\n'
        break
      case options.initTwice:
        contents += 'await app.initServer()\n'
        contents += 'await app.initServer()\n'
        contents += `${defaultMessages}\n`
        break
      case options.startTwice:
        contents += 'await app.startServer()\n'
        contents += 'await app.startServer()\n'
        contents += `${defaultMessages}\n`
        break
      case options.msgEnabled:
        contents += `await app.${options.method}()\n`
        contents += `${defaultMessages}\n`
        contents += 'const sinon = require(\'sinon\')\n'
        contents += 'let config = {shouldAdvanceTime: true}\n'
        contents += 'let clock = sinon.useFakeTimers(config)\n'
        contents += '\nprocess.on(\'message\', () => {\n'
        contents += 'console.log(\'msg recieved\')\n'
        contents += 'clock.tick(30000)\n'
        contents += '})\n'
        break
      case options.exitProcess:
        contents += `await app.${options.method}()\n`
        contents += `${defaultMessages}\n`
        contents += `app.expressApp.get('${options.serverType}').on('close', () => {\n`
        contents += '  process.exit()\n'
        contents += '})\n'
        break
      default:
        contents += `await app.${options.method}()\n`
        contents += `${defaultMessages}\n`
    }
    // server can be stopped by passing a message to the child process
    if (options.stopServer) {
      options.close = options.close === true ? '{ persistProcess: true }' : ''
      contents += '\nprocess.on(\'message\', (msg) => {\n'
      contents += '  if (msg === \'stop\') {\n'
      contents += `    app.stopServer(${options.close})\n`
      contents += '  }\n})\n'
    }
  } else {
    contents += defaultMessages
  }

  contents += '\n})()'

  // generate test app directory
  fs.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), contents)
}
