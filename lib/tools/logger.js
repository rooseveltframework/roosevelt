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
  constructor (params) {
    if (params) {
      this.enableLogging = params.appStatus
      this.enableWarnings = params.warnings
      this.enableVerbose = params.verbose
    }
  }

  log () {
    if (this.enableLogging) {
      let logs = parseLogs(arguments)
      console.log(...logs)
    }
  }

  warn () {
    if (this.enableWarnings) {
      let logs = parseLogs(arguments, 'warn')
      console.warn(...logs)
    }
  }

  verbose () {
    if (this.enableVerbose) {
      let logs = parseLogs(arguments)
      console.log(...logs)
    }
  }

  error () {
    let logs = parseLogs(arguments, 'error')
    console.error(...logs)
  }
}

module.exports = (app) => new Logger(app)
