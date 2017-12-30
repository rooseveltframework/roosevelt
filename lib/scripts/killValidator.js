require('colors')

const exec = require('child_process').exec
const path = require('path')
const http = require('http')
const net = require('net')
const logger = require('../tools/logger')()
const appDir = process.cwd()
let host = 'localhost'
let foundValidator = false
let pid
let pkg
let rooseveltConfig
let startPort = 1
let endPort = 65535
let timeout = 2000
let currentPort
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
  http.get(validatorOptions, function (res) {
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
      return
    }

    res.setEncoding('utf8')

    res.on('data', (chunk) => {
      rawData += chunk
    })

    res.on('end', () => {
      try {
        if (rawData.includes('Nu Html Checker')) {
          logger.log('✔️', `Validator successfully found on port: ${validatorOptions.port}`.green)
          foundValidator = true
          killValidator(validatorOptions.port)
        } else {
          logger.warn(`Could not find validator on port: ${validatorOptions.port}. Scanning for validator now...`.yellow)
          scanForValidator()
        }
      } catch (err) {
        logger.error(`${err}`.red)
      }
    })
  }).on('error', (error) => {
    if (error.message.includes('ECONNREFUSED')) {
      logger.warn(`Could not find validator on port: ${validatorOptions.port}. Scanning for validator now...`.yellow)
      scanForValidator()
    } else {
      logger.error(`${error.message}`.red)
    }
  })
}
getValidator()

/**
 * scans available ports for html validator
 * @function scanForValidator
 */
function scanForValidator () {
  while (startPort <= endPort) {
    currentPort = startPort;

    (function (currentPort) {
      let socket = new net.Socket()

      socket.setTimeout(timeout, function () {
        socket.destroy()
      })

      socket.connect(currentPort, host, function () {
        let options = {
          url: 'http://localhost:',
          port: currentPort,
          method: 'GET',
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
            try {
              if (rawData.includes('Nu Html Checker')) {
                logger.log('✔️', `Validator succesfully found on port: ${currentPort}`.green)
                foundValidator = true
                killValidator(currentPort)
              }
            } catch (err) {
              logger.error(`${err}`.red)
            }
          })
        }).on('error', (error) => {
          logger.error(`${error}`.red)
          // possibly revisit here if errors show up
        })
      })

      socket.on('error', function (error) {
        if (error.message.includes('ECONNRESFUSED')) {
          // handling for this error, continue as normal
        }
      })
    })(currentPort)
    startPort++
  }
  setTimeout(function () {
    if (foundValidator === false) {
      logger.error('Could not find the validator at this time, please make sure that the validator is running.'.red)
      process.exit()
    }
  }, 15000)
}

/**
 * kills the html validator
 * @function killValidator
 * @param {number} currentPort - current port that the validator is listening on
 */
function killValidator (currentPort) {
  // for Windows
  if (process.platform === 'win32') {
    exec('netstat -n -a -o | findstr 0.0.0.0:' + currentPort + '.*LISTENING', function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }

      pid = stdout.match(/\d+$/gm)
      if (!pid) {
        throw new TypeError('No PID found on port.'.red)
      } else {
        logger.log('🔍', `Found pid ${pid} on port: ${currentPort}. Killing ${pid}...`.magenta)

        process.kill(pid)
        logger.log('✔️', `Pid ${pid} has been killed`.green)
      }
      logger.log('✔️', `Validator successfully closed on port: ${currentPort}`.green)
      process.exit()
    })
  }
  // for Mac and Ubuntu
  if (process.platform === 'darwin' || process.platform === 'linux') {
    exec('lsof -t -i:' + currentPort + ' | kill -9 $(lsof -t -i:' + currentPort + ')', function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }
      logger.log('✔️', `Killed process on port: ${currentPort}`.green)
      process.exit()
    })
  }
}
