const emoji = require('node-emoji')

function parseLogs (input, type) {
  let logs = []
  let arg
  let i

  if (type) {
    if (typeof input[0] !== 'string' || !emoji.which(input[0])) {
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

class Logger {
  constructor (app) {
    if (app) {
      this.suppressLogs = app.get('params').suppressLogs.rooseveltLogs
    }
  }

  log () {
    if (!this.suppressLogs) {
      let logs = parseLogs(arguments)
      console.log(...logs)
    }
  }

  warn () {
    let logs = parseLogs(arguments, 'warn')
    console.warn(...logs)
  }

  error () {
    let logs = parseLogs(arguments, 'error')
    console.error(...logs)
  }
}

module.exports = (app) => new Logger(app)
