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
  let str = ''
  // convert arguments object to array
  let args = Array.prototype.slice.call(input)
  // if the first arg is a string and the first arg isn't an emoji add the types emoji
  if (typeof args[0] === 'string' && !emoji.which(args[0])) {
    switch (type) {
      case 'warn':
        str += '⚠️   '
        break
      case 'error':
        str += '❌  '
        break
    }
  }
  // iterate through args and check for objects for proper string representation
  for (let k in args) {
    // proper spacing if the argument is an emoji
    if (typeof args[k] === 'string' && emoji.which(args[k])) {
      // add 2 spaces after an emoji
      str += args[k] + '  '
    } else if (typeof args[k] === 'object') {
      // if the argument is an object use the inspect utility on it
      args[k] = util.inspect(args[k], false, null, true)
      // after an object arguments add 1 space
      str += args[k] + ' '
    } else {
      // everything else will have 1 space
      str += args[k] + ' '
    }
  }
  // trim white space from the end of a string
  str = str.replace(/\s*$/, '')
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
        } else if (key === 'disable') {
          // loop through array of args in the disable param
          for (let env in params[key]) {
            // if the arg is set to true/"true" in process.env or it's the env in process.env.NODE_ENV, supress the logs
            if (process.env.NODE_ENV === params[key][env] || process.env[params[key][env]] === true || process.env[params[key][env]] === 'true') {
              transports.console.silent = true
            }
          }
        } else {
          // the param is a new key that's not one of the defaults
          let enable
          let type
          // check if the new key is an object
          if (typeof params[key] === 'object') {
            // assign values. if enable isn't set, set it to true
            enable = (params[key]['enable'] !== undefined) ? params[key]['enable'] : true
            type = params[key]['type'] || 'info'
          } else {
            // if it's not an object set enable
            enable = params[key]
            type = 'info'
          }
          // create a function for the new param
          this[key] = function () {
            // log if the param is set to true
            if (enable !== 'false' && enable !== false) {
              // parse the log arguments
              let logs = argumentsToString(arguments, type)
              // send the log level and message to winston for logging
              logger.log({ level: type, message: logs })
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
      logger.log({ level: 'info', message: argumentsToString(arguments) })
    }
  }

  // warning logs
  warn () {
    if (this.enableWarnings !== 'false' && this.enableWarnings !== false) {
      logger.log({ level: 'warn', message: argumentsToString(arguments, 'warn') })
    }
  }

  // verbose logs
  verbose () {
    if (this.enableVerbose !== 'false' && this.enableVerbose !== false) {
      logger.log({ level: 'info', message: argumentsToString(arguments) })
    }
  }

  // error logs are always on by default
  error () {
    logger.log({ level: 'error', message: argumentsToString(arguments, 'error') })
  }
}

module.exports = (app) => new Logger(app)
