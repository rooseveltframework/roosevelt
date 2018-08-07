const emoji = require('node-emoji')
const winston = require('winston')
const util = require('util')
const { combine, printf } = winston.format

// logger module
const logger = winston.createLogger({
  // make the output clean
  format: combine(
    printf(info => `${info.message}`)
  ),
  // basic transport set-up
  transports: [
    new winston.transports.Console({
      json: false,
      colorize: true
    })
  ]
})

// pass in function arguments object and returns string with spaces
function argumentsToString (input, type) {
  let str = []
  // convert arguments object to array
  let args = Array.prototype.slice.call(input)
  // if type is passed and the first arg isn't an emoji add the types emoji
  if (type && !emoji.which(args[0])) {
    str.push(type === 'warn' ? '⚠️   ' : '❌   ')
  }
  // iterate through args and check for objects for proper string representation
  for (let k in args) {
    // proper spacing if the argument is an emoji
    if (emoji.which(args[k])) {
      if (k === '0') {
        args[0] = args[0] + '  '
      } else {
        args[k] = '  ' + args[k] + '  '
      }
    } else if (typeof args[k] === 'object') {
      // if the argument is an object use the inspect utility on it
      args[k] = util.inspect(args[k], false, null, true)
    }
  }
  // concatenate the arguments with a space
  str += args.join(' ')
  return str
}

class Logger {
  constructor (params) {
    if (params) {
      this.enableAppStatus = params.appStatus
      this.enableWarnings = params.warnings
      this.enableVerbose = params.verbose
      this.winston = winston
    }
  }

  // appStatus logs
  log () {
    if (this.enableAppStatus !== 'false' && this.enableAppStatus !== false) {
      logger.log({level: 'info', message: argumentsToString(arguments)})
    }
  }

  // warning logs
  warn () {
    if (this.enableWarnings !== 'false' && this.enableWarnings !== false) {
      logger.log({level: 'warn', message: argumentsToString(arguments, 'warn')})
    }
  }

  // verbose logs
  verbose () {
    if (this.enableVerbose !== 'false' && this.enableVerbose !== false) {
      logger.log({level: 'info', message: argumentsToString(arguments)})
    }
  }

  // error logs are always on by default
  error () {
    logger.log({level: 'error', message: argumentsToString(arguments, 'error')})
  }
}

module.exports = (app) => new Logger(app)
