const spawn = require('child_process').spawn
const request = require('supertest')
const fse = require('fs-extra')
const path = require('path')
const logger = require('./../tools/logger')()

let HTMLValidatorPort = process.argv[2]
let timeout = process.argv[3]
let timeoutHolder

function startTimeout () {
  timeoutHolder = setTimeout(() => {
    request(`http://localhost:${HTMLValidatorPort}`)
      .get('/sefslknisnfsnfsenf')
      .expect(404, (err, res) => {
        // if we get an error, likely that the connection is close and is safe to try to close server
        if (err) {
          logger.log('cannot connect to app, killing the validator now')

          const killLine = spawn('node', [path.join(`${__dirname}/killValidator.js`)], {stdio: 'pipe', shell: false, windowsHide: true})

          killLine.stdout.on('data', (data) => {
            logger.log(`k stdout: ${data}`)
          })

          killLine.stderr.on('data', (data) => {
            logger.log(`k stderr: ${data}`)
          })

          killLine.on('exit', () => {
            process.exit()
          })
        } else {
          logger.log('app is still active, resetting timer')
          clearTimeout(timeoutHolder)
          startTimeout()
        }
      })
  }, timeout)
}

let filePath = path.join(__dirname, 'PID.txt')
fse.writeFileSync(filePath, `${process.pid}`)
logger.log(`Starting the auto Validator Killer, going to kill the validator in ${timeout / 1000} seconds if the app is not in use anymore`)
startTimeout()

process.on('exit', () => {
  logger.log('Exiting auto Killer')
  let filePath = path.join(__dirname, 'PID.txt')
  fse.unlinkSync(filePath)
})
