const spawn = require('child_process').spawn
const request = require('supertest')
const fse = require('fs-extra')
const path = require('path')

let HTMLValidatorPort = process.argv[2]
let timeout = 10000
let timeoutHolder
process.title = 3

function startTimeout () {
  timeoutHolder = setTimeout(() => {
    request(`http://localhost:${HTMLValidatorPort}`)
      .get('/sefslknisnfsnfsenf')
      .expect(404, (err, res) => {
        // if we get an error, likely that the connection is close and is safe to try to close server
        if (err) {
          console.log('cannot connect to app, killing the validator now')
          const killLine = spawn('node', [`lib/scripts/killValidator.js`], {stdio: 'pipe', shell: false, windowHide: false})

          killLine.stdout.on('data', (data) => {
            console.log(`k stdout: ${data}`)
          })

          killLine.stderr.on('data', (data) => {
            console.log(`k stderr: ${data}`)
          })

          killLine.on('exit', () => {
            let filePath = path.join(__dirname, 'PID.txt')
            fse.unlinkSync(filePath)
            process.exit()
          })
        } else {
          console.log(process.title.toString('utf8'))
          console.log('app is still active, resetting timer')
          clearTimeout(timeoutHolder)
          startTimeout()
        }
      })
  }, timeout)
}

if (process.platform === 'win32') {
  let filePath = path.join(__dirname, 'PID.txt')
  fse.writeFileSync(filePath, `${process.pid}`)
}
console.log(`Starting the auto Validator Killer, going to kill the validator in ${timeout / 1000} seconds if the app is not in use anymore`)
startTimeout()
