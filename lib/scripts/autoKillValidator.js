const spawn = require('child_process').spawn
const http = require('http')
const fse = require('fs-extra')
const path = require('path')
const tmp = require('tmp')
const os = require('os')

let appPort = process.argv[2]
let timeout = process.argv[3]
let verbose = {verbose: process.argv[4] === 'false'}
let timeoutHolder

const logger = require('./../tools/logger')(verbose)

function startTimeout () {
  timeoutHolder = setTimeout(() => {
    // options to pass into the http GET request
    let options = {
      url: 'http://localhost',
      method: 'GET',
      port: appPort,
      path: '/sfesfsefisoeo',
      headers: {
        'User-Agent': 'request'
      }
    }
    // after the timeout period, send a http request
    http.get(options, function (res) {
      res.setEncoding('utf8')

      res.on('data', () => {
      })

      // if we get any sort of response, then that means the app is still active and that the timer should reset
      res.on('end', () => {
        logger.verbose('app is still active, resetting timer')
        clearTimeout(timeoutHolder)
        startTimeout()
      })

    // if we get an error, likely that the connection is close and is safe to try to close the validator
    }).on('error', () => {
      logger.verbose('cannot connect to app, killing the validator now')
      const killLine = spawn('node', [path.join(`${__dirname}/killValidator.js`)], {stdio: 'pipe', shell: false, windowsHide: true})

      killLine.stdout.on('data', (data) => {
        logger.verbose(`stdout: ${data}`)
      })

      killLine.on('exit', () => {
        process.exit()
      })
    })
  }, timeout)
}

let tempObj = tmp.fileSync({keep: true, name: 'roosevelt_validator_pid.txt'})
fse.writeFileSync(tempObj.name, process.pid)
logger.verbose(`Starting the auto Validator Killer, going to kill the validator in ${timeout / 1000} seconds if the app is not in use anymore`)

startTimeout()

process.on('exit', () => {
  let filePath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
  fse.unlinkSync(filePath)
  logger.verbose('Exiting auto Killer')
})
