const emoji = require('node-emoji')
const winston = require('winston')
const util = require('util')
const { combine, printf } = winston.format
const loggerDefaults = require('../defaults/config.json').logging

// transports object to easily override settings
const transports = {
  console: new winston.transports.Console({
    stderrLevels: ['error', 'warn'],
    json: false,
    colorize: true
  })
}

// logger module
const logger = winston.createLogger({
  // clean output instead of wintons default
  format: combine(
    printf(info => `${info.message}`)
  ),
  // basic console transport set-up
  transports: [
    transports.console
  ]
})

// pass in input object and returns string with spaces
function argumentsToString (input, type) {
  let str = []
  // convert arguments object to array
  let args = Array.prototype.slice.call(input)
  // if the first arg is a string and the first arg isn't an emoji add the types emoji
  if (typeof args[0] === 'string' && !emoji.which(args[0])) {
    switch (type) {
      case 'warn':
        str.push('⚠️  ')
        break
      case 'error':
        str.push('❌  ')
        break
    }
  }
  // iterate through args and check for objects for proper string representation
  for (let k in args) {
    // proper spacing if the argument is an emoji
    if (typeof args[k] === 'string' && emoji.which(args[k])) {
      if (k === '0') {
        // prefixed emojis will be 2 spaces
        str += args[0] + '  '
      } else {
        // non prefixed emojis will be 2 spaces
        str += args[k]
        if (k !== args.length - 1) str += '  '
      }
    } else if (typeof args[k] === 'object') {
      // if the argument is an object use the inspect utility on it
      args[k] = util.inspect(args[k], false, null, true)
      str += args[k]
      // after an object arguments add 1 space
      if (k !== args.length - 1) str += ' '
    } else {
      // everything else will have 1 space
      str += args[k]
      if (k !== args.length - 1) str += ' '
    }
  }
  // return string
  return str
}

class Logger {
  constructor (params) {
    // check to see if parameters are set
    if (params && typeof params === 'object') {
      // iterate over params
      for (let key in params) {
        // check if the param is already a key in the defaults
        if (key in loggerDefaults) {
          // set the value for the default param
          switch (key) {
            case 'appStatus':
              this.enableAppStatus = params[key]
              break
            case 'warnings':
              this.enableWarnings = params[key]
              break
            case 'verbose':
              this.enableVerbose = params[key]
              break
          }
        } else {
          // the param is a new key that's not one of the defaults
          let enabled
          let type
          // check if the new key is an object
          if (typeof params[key] === 'object') {
            // assign values. if enabled isn't set, set it to true
            enabled = params[key]['enabled'] || true
            type = params[key]['type'] || 'info'
          } else {
            // if it's not an object set enabled
            enabled = params[key]
            type = 'info'
          }
          // create a function for the new param
          this[key] = function () {
            // log if the param is set to true
            if (enabled !== 'false' && enabled !== false) {
              // parse the log arguments
              let logs = argumentsToString(arguments, type)
              // send the log level and message to winston for logging
              logger.log({level: type, message: logs})
            }
          }
        }
      }
    } else {
      // if there are no parameters, use the defaults
      this.enableAppStatus = true
      this.enableWarnings = true
      this.enableVerbose = false
    }
  }

  // default log types
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
