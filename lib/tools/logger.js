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
      if (typeof params === 'object') {
        this.suppressLogs = params.rooseveltLogs
        this.suppressWarnings = params.rooseveltWarnings
        this.suppressVerbose = params.verboseLogs
      }
    }
  }

  log () {
    if (!this.suppressLogs) {
      let logs = parseLogs(arguments)
      console.log(...logs)
    }
  }

  warn () {
    if (!this.suppressWarnings) {
      let logs = parseLogs(arguments, 'warn')
      console.warn(...logs)
    }
  }

  verbose () {
    if (!this.suppressVerbose) {
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
