const emoji = require('node-emoji')

function parseLogs (input, type) {
  let logs = []
  let arg
  let i

  if (type) {
    if (!emoji.which(input[0])) {
      logs.push(type === 'warn' ? '⚠️ ' : '❌ ')
    }
  }

  for (i in input) {
    arg = input[i]

    if (typeof arg === 'string' && emoji.which(arg)) {
      arg += ' '
    }

    logs.push(arg)
  }

  return logs
}

function Logger (app) {
  let suppressLogs

  if (app) {
    suppressLogs = app.get('params').suppressLogs.rooseveltLogs
  }

  this.log = function () {
    if (!suppressLogs) {
      let logs = parseLogs(arguments)
      console.log(...logs)
    }
  }

  this.warn = function () {
    let logs = parseLogs(arguments, 'warn')
    console.warn(...logs)
  }

  this.error = function () {
    let logs = parseLogs(arguments, 'error')
    console.error(...logs)
  }
}

module.exports = (app) => new Logger(app)
