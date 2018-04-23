require('colors')

const path = require('path')
const http = require('http')
const net = require('net')
const fkill = require('fkill')
const logger = require('../tools/logger')()
const appDir = process.cwd()
let host = 'localhost'
let foundValidator = false
let timer
let socketHolder = []
let endingPortHitBool = false
let pkg
let rooseveltConfig
let startPort = 0
let endPort = 65535
let timeout = 2000
let validatorOptions = {
  url: 'http://localhost',
  method: 'GET',
  headers: {
    'User-Agent': 'request'
  }
}

try {
  pkg = require(path.join(appDir, 'package.json'))
  rooseveltConfig = pkg.rooseveltConfig
  validatorOptions.port = rooseveltConfig.htmlValidator.port || '8888'
} catch (e) {
  validatorOptions.port = '8888'
}

/**
 * gets validator, if not on specified port, calls to search function
 * @function getValidator
 */
function getValidator () {
  let req = http.get(validatorOptions, function (res) {
    const { statusCode } = res

    let error
    let rawData = ''

    if (statusCode !== 200) {
      error = new Error(`Request Failed.\nStatus Code: ${statusCode}`)
    }
    if (error) {
      // consume 404 response data
      logger.error(error.message)
      res.resume()
      scanForValidator()
    }

    res.setEncoding('utf8')

    res.on('data', (chunk) => {
      rawData += chunk
    })

    res.on('end', () => {
      if (rawData.includes('Nu Html Checker')) {
        logger.log('✔️', `Validator successfully found on port: ${validatorOptions.port}`.green)
        foundValidator = true
        killValidator(validatorOptions.port)
      } else {
        logger.warn(`Could not find validator on port: ${validatorOptions.port}. Scanning for validator now...`.yellow)
        scanForValidator()
      }
    })
  }).on('error', (error) => {
    if (error.message.includes('ECONNREFUSED')) {
      logger.warn(`Could not find validator on port: ${validatorOptions.port}. Scanning for validator now...`.yellow)
      scanForValidator()
    } else {
      logger.error(`Error Occurred: ${error.message}. Scanning for validator now`.red)
      scanForValidator()
    }
  }).on('socket', (socket) => {
    socket.setTimeout(timeout)
    socket.on('timeout', () => {
      req.abort()
    })
  })
}
getValidator()

/**
 * scans available ports for html validator
 * @function scanForValidator
 */
function scanForValidator () {
  let scanPorts = (start, end) => {
    while (start <= end) {
      let port = start;

      (function (port) {
        var s = new net.Socket()
        socketHolder.push(port)
        s.setTimeout(timeout, function () { s.destroy() })
        s.connect(port, host, function () {
          let options = {
            method: 'GET',
            port: port,
            headers: {
              'User-Agent': 'request'
            }
          }
          http.get(options, function (res) {
            res.setEncoding('utf8')

            let rawData = ''

            res.on('data', (chunk) => {
              rawData += chunk
            })

            res.on('end', () => {
              if (rawData.includes('Nu Html Checker')) {
                logger.log('✔️', `Validator successfully found on port: ${port}`.green)
                foundValidator = true
                killValidator(port)
              }
            })
          }).on('error', (err) => {
            s.destroy(err)
          })
        })

        s.on('error', function (e) {
          s.destroy()
        })

        s.on('close', () => {
          let index = socketHolder.indexOf(port)
          socketHolder.splice(index, 1)
          if (endingPortHitBool === true) {
            if (socketHolder.length === 0) {
              clearTimeout(timer)
              scanResults()
            }
          }
          if (port === end) {
            if (end === endPort) {
              endingPortHitBool = true
            } else {
              let newEndPort = end + 2000
              if (newEndPort < endPort) {
                scanPorts(end, newEndPort)
              } else {
                newEndPort = endPort
                scanPorts(end, newEndPort)
              }
            }
          }
        })
      })(port)
      start++
    }
  }

  scanPorts(startPort, 2000)

  timer = setTimeout(function () {
    scanResults()
  }, 100000)
}

function scanResults () {
  if (foundValidator === false) {
    logger.error('Could not find the validator at this time, please make sure that the validator is running.'.red)
    process.exit()
  } else {
    logger.log('Found and closed all validators at the moment, exiting killValidator'.green)
    process.exit()
  }
}

/**
 * kills the html validator
 * @function killValidator
 * @param {number} currentPort - current port that the validator is listening on
 */
function killValidator (currentPort) {
  fkill(`:${currentPort}`, {force: true}).then(() => {
    logger.log('✔️', `Killed process on port: ${currentPort}`.green)
  })
}
