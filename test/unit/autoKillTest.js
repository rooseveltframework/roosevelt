/* eslint-env mocha */

const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork

describe('autokill Test', function () {
  this.timeout(40000)
  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlValidatorTest')

  // options that would be put into generateTestApp params
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('autokill Test', function (done) {
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: true
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
    testApp.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })
    testApp.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })
    testApp.on('message', () => {
      setTimeout(() => {
        // testApp.kill('SIGINT')
      }, 1000)
    })
    testApp.on('exit', () => {
      setTimeout(() => {
        console.log('ended')
        done()
      }, 10000)
    })
  })
})
