require('colors')

const exec = require('child_process').exec
const portscanner = require('portscanner')
const path = require('path')
const http = require('http')
const net = require('net')
const fkill = require('fkill')
const logger = require('../tools/logger')()
const appDir = process.cwd()
let host = 'localhost'
let foundValidator = false
let portHolder = []
let finalPorts = []
let cPort
let portString
let pkg
let timer
let rooseveltConfig
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
      getOpenPorts()
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
        getOpenPorts()
      }
    })
  }).on('error', (error) => {
    if (error.message.includes('ECONNREFUSED')) {
      logger.warn(`Could not find validator on port: ${validatorOptions.port}. Scanning for validator now...`.yellow)
      getOpenPorts()
    } else {
      logger.error(`Error Occurred: ${error.message}. Scanning for validator now`.red)
      getOpenPorts()
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
 * uses command line to get list of ports w/ potentially open connection
 * @function getOpenPorts
 */
function getOpenPorts () {
  if (process.platform === 'win32') {
    exec('netstat -an', function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }
      if (stderr) {
        logger.error(`${stderr}`.red)
      }

      portString = stdout.match(/\d{4,5}/gm) + ''

      if (!portString) {
        throw new TypeError('No open ports found.'.red)
      } else {
        portHolder = arrayify(portString)
      }
      scanPotentialPorts()
    })
  }
  if (process.platform === 'darwin') {
    exec('netstat -ap tcp | grep -i "listen"', function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }
      if (stderr) {
        logger.error(`${stderr}`.red)
      }

      portString = stdout.match(/\d{4,5}/gm) + ''

      if (!portString) {
        throw new TypeError('No open ports found.'.red)
      } else {
        portHolder = arrayify(portString)
      }
      scanPotentialPorts()
    })
  }
  if (process.platform === 'linux') {
    exec('netstat -lnt', function (err, stdout, stderr) {
      if (err) {
        logger.error(`${err}`.red)
      }
      if (stderr) {
        // ignore permissions error message on linux
        if (!stderr.includes('(Not all processes')) {
          logger.error(`${stderr}`.red)
        }
      }

      portString = stdout.match(/\d{4,5}/gm) + ''

      if (!portString) {
        throw new TypeError('No open ports found.'.red)
      } else {
        portHolder = arrayify(portString)
      }
      scanPotentialPorts()
    })
  }
  // time out scanning for validator after 100000ms then scans results
  timer = setTimeout(function () {
    scanResults()
  }, 100000)
}

/**
 * takes string from stdout and turns it into array of ports, ignoring duplicates
 * @function arrayify
 */
function arrayify (portString) {
  let i
  let ar = portString.trim().split(',')
  let final = []
  for (i = 0; i < ar.length; i++) {
    if (!final.includes(ar[i], 0)) {
      final.push(ar[i])
    }
  }
  return final
}

/**
 * sends potential ports to portscanner module for confirmation, then calls to scan through confirmed ports
 * @function scanPotentialPorts
 */
function scanPotentialPorts () {
  let index = 0
  while (index < portHolder.length) {
    let port = portHolder[index]
    confirmPort(port)
    index++
  }
  setTimeout(function () {
    scanFinalPorts()
  }, 2000)
}

/**
 * takes ports from portHolder array and confirms if they are open or not then pushes
 * confirmed ports to a finalPorts array
 * @function confirmPort
 * @param {number} port - port to check status of
 */
function confirmPort (port) {
  portscanner.checkPortStatus(port, '0.0.0.0', function (error, status) {
    if (status === 'open') {
      finalPorts.push(port)
    } else if (error) {
      logger.error(error)
    }
  })
}

/**
 * sends each port to final method making http.get requests to each final port
 * @function scanFinalPorts
 */
function scanFinalPorts () {
  let index = 0
  while (index < finalPorts.length) {
    cPort = finalPorts[index]
    checkForValidator(cPort)
    index++
  }
  // wait for while loop to finish, if all ports in array were exhausted we scan results
  setTimeout(function () {
    if (index === finalPorts.length) {
      clearTimeout(timer)
      scanResults()
    }
  }, 5000)
}

/**
 * makes request to port, checking for validator
 * @function checkForValidator
 * @param {number} cPort - current final port being checked
 */
function checkForValidator (cPort) {
  let s = new net.Socket()

  s.setTimeout(2000, function () {
    s.destroy()
  })

  s.connect(cPort, host, function () {
    let options = {
      url: 'http://localhost:',
      port: cPort,
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
            logger.log('✔️', `Validator successfully found on port: ${cPort}`.green)
            foundValidator = true
            killValidator(cPort)
          }
        } catch (err) {
          logger.error(`${err}`.red)
        }
      })
    }).on('error', (error) => {
      if (!error.message.includes('socket hang up')) {
        if (!error.message.includes('ECONNRESET')) {
          logger.error(`${error}`.red)
        }
      }
      // possibly revisit here if errors show up
    })
  })

  s.on('error', function (error) {
    if (error.message.includes('ECONNRESFUSED')) {
      // handling for this error, continue as normal
    }
  })
}

/**
 * checks to see if a validator was found at the end of script runtime
 * @function scanResults
 */
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
 * makes call to fkill module sending port confirmed to have validator on it
 * @function killValidator
 * @param {number} currentPort
 */
function killValidator (currentPort) {
  fkill(`:${currentPort}`, {force: true}).then(() => {
    logger.log('✔️', `Killed process on port: ${currentPort}`.green)
    clearTimeout(timer)
    scanResults()
  })
}
