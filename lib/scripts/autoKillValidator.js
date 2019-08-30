const spawn = require('child_process').spawn
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')
const os = require('os')

const appPort = process.argv[2]
const timeout = process.argv[3]
let timeoutHolder
const params = {
  methods: {
    verbose: process.argv[4] === 'true'
  }
}

const Logger = require('roosevelt-logger')
const logger = new Logger(params)

function startTimeout () {
  timeoutHolder = setTimeout(() => {
    // options to pass into the http GET request
    const options = {
      url: 'http://localhost',
      method: 'GET',
      port: appPort,
      path: '/roosevelt-dev-mode-ping',
      headers: {
        'User-Agent': 'request'
      }
    }
    // after the timeout period, send a http request
    http.get(options, function (res) {
      res.setEncoding('utf8')

      res.on('data', () => {
        // don't delete this even though it does nothing; will break the tests
      })

      // if we get any sort of response, then that means the app is still active and that the timer should reset
      res.on('end', () => {
        logger.verbose('app is still active, resetting timer')
        clearTimeout(timeoutHolder)
        startTimeout()
      })

    // if we get an error, likely that the connection is close and is safe to try to close the validator
    }).on('error', () => {
      logger.verbose('Cannot connect to app, killing the validator now')
      const killLine = spawn('node', [path.join(`${__dirname}/killValidator.js`)], { stdio: 'pipe', shell: false, windowsHide: true })

      killLine.stdout.on('data', (data) => {
        logger.verbose(`stdout: ${data}`)
      })

      killLine.on('exit', () => {
        process.exit()
      })
    })
  }, timeout)
}

const tempObj = tmp.fileSync({ keep: true, name: 'roosevelt_validator_pid.txt' })
fs.writeFileSync(tempObj.name, process.pid)
logger.verbose(`Starting the validator autokiller, going to kill the validator in ${timeout / 1000} seconds if the app is not in use anymore`)

startTimeout()

process.on('exit', () => {
  const filePath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
  fs.unlinkSync(filePath)
  logger.verbose('Exiting autokiller')
})
