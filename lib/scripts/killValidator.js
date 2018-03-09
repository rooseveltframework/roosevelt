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
let startPort = 0
let endPort = 65535
let timeout = 5000
let validatorOptions = {
  url: 'http://localhost',
  method: 'GET',
  headers: {
    'User-Agent': 'request'
  }
}

try {
  pkg = require(path.join(appDir, 'package.json'))
  console.log(path.join(appDir, 'package.json'))
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
/*
MY PROPOSAL: From what I gather, my hypothesis on why the original way was not working was because since it was blasting through trying to connect to 65535 ports at once,
my computer, and thus travis, didn't have enough resources to try to attemp that. What I have done here is I tried to make a function that will only scan one port at a time of a section of
the total amount of ports. Doing this, I can cut down on how many connections and resources are being used to try to find the validator.
*/

  function scanPort (startingPort, endingPort) {
    if (startingPort < endingPort) {
      let currentPortinTest = startingPort
      const socket = net.createConnection({
        port: currentPortinTest,
        host: host,
        timeout: timeout
      }, () => {
        let options = {
          url: 'http://localhost',
          method: 'GET',
          port: currentPortinTest,
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
                logger.log('✔️', `Validator successfully found on port: ${currentPortinTest}`.green)
                foundValidator = true
                killValidator(currentPortinTest)
              }
            } catch (err) {
              logger.error(`${err}`.red)
            }
          })
        }).on('error', (error) => {
          logger.error(`${error}`.red)
        })
      })

      socket.on('error', (err) => {
        if (err.message.includes('ECONNRESFUSED')) {
          // handling for this error, continue as normal
        }
        socket.destroy()
        currentPortinTest++
        scanPort(currentPortinTest, endingPort)
      })

      socket.on('end', () => {
        socket.destroy()
        currentPortinTest++
        scanPort(currentPortinTest, endingPort)
      })
    }
  }

  while (startPort < endPort) {
    let EPort = startPort + 15
    scanPort(startPort, EPort)
    startPort = startPort + 15
  }

  setTimeout(function () {
    if (foundValidator === false) {
      logger.error('Could not find the validator at this time, please make sure that the validator is running.'.red)
      process.exit()
    }
  }, 25000)
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
    exec(`fuser -k ${currentPort}/tcp`, function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }
      logger.log('✔️', `Killed process on port: ${currentPort}`.green)
      process.exit()
    })
  }
}
