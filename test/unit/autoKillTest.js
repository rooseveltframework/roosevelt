/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fkill = require('fkill')
const fork = require('child_process').fork
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

describe('Roosevelt Autokill Test', function () {
  // directory for the test app
  const appDir = path.join(__dirname, '../app/htmlValidatorTest')

  // options to pass into test app generator
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true}

  // clean up the test app directory after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should kill the validator after the app has gracefully shutdown if the validator is a seperate process', function (done) {
    let cannotConnectBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      logging: {
        verbose: true
      },
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 8888,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('Killed process with PID')) {
        htmlValidatorPortClosedBool = true
        exit()
      } else if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      } else if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      }
    })

    // when the app finishes initiailization, kill it
    testApp.on('message', (msg) => {
      testApp.send('stop')
    })

    // when the autokiller has confirmed it has killed the process, check assertions and finish this test
    function exit () {
      assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
      assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
      assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
      done()
    }
  })

  it('should restart the autokill timer if the app is still active, then once the app has gracefully shutdown it should kill the validator.', function (done) {
    let timerResetBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      logging: {
        verbose: true
      },
      htmlValidator: {
        enable: true,
        port: 8888,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 10000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }
      // on this specific log, kill the app
      if (data.includes('app is still active, resetting timer')) {
        timerResetBool = true
        testApp.send('stop')
      } else if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      } else if (data.includes('Killed process with PID')) {
        htmlValidatorPortClosedBool = true
        exit()
      }
    })

    // when the autokiller has confirmed it has killed the process, check assertions and finish this test
    function exit () {
      assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
      assert.equal(timerResetBool, true, 'auto Killer did not reset its timer when it checked if the app was closed while it was still opened')
      assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
      assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
      done()
    }
  })

  it('should say that its restarting auto Killer if one is running and the app is being initialized again', function (done) {
    let restartAutoKillerLogBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      logging: {
        verbose: true
      },
      htmlValidator: {
        enable: true,
        port: 8888,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // spawn an autoKiller instance
    spawn('node', [`${path.join(__dirname, '../../lib/scripts/autoKillValidator.js')}`, 8888, 10000, true], { detached: true, stdio: 'inherit', shell: false, windowsHide: true })

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('Restarting autoKiller')) {
        restartAutoKillerLogBool = true
      } else if (data.includes('Killed process with PID')) {
        exit()
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the autokiller has confirmed it has killed the process, check assertions and finish this test
    function exit () {
      assert.equal(restartAutoKillerLogBool, true, 'Roosevelt did not restart the autoKiller')
      done()
    }
  })

  it('should be able to say that there is no autoKiller and that it is starting a new one if the roosevelt_validator_pid.txt file exists, but the process is already dead', function (done) {
    let noAutoKillerFromPIDBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      logging: {
        verbose: true
      },
      htmlValidator: {
        enable: true,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the output stream, check for specific logs
    testApp.stdout.on('data', data => {
      // kill the app after the auto killer runs
      if (data.includes('Starting the auto Validator Killer')) {
        testApp.send('stop')

        // start a second test app
        startSecondApp()
      }
    })

    function startSecondApp () {
      const PIDFilePath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
      let content = fse.readFileSync(PIDFilePath).toString('utf8')
      let PID = parseInt(content)
      fkill(PID, { force: true }).then(() => {
        // create a second App
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

        // check the console logs to see if our message was outputted
        testApp2.stdout.on('data', (data) => {
          if (data.includes('There was no autoKiller running with the PID given, creating a new one')) {
            noAutoKillerFromPIDBool = true
          } else if (data.includes('Exiting auto Killer')) {
            // wait for the auto killer to finish before exiting the test
            exit()
          }
        })

        // when its finish with initialization, kill it
        testApp2.on('message', () => {
          testApp2.send('stop')
        })

        function exit () {
          assert.equal(noAutoKillerFromPIDBool, true, 'The auto Killer was not started after there was no process found with the given PID')
          done()
        }
      })
    }
  })

  it('should log that a validator will be created if one isn\'t running but all other logs are hidden due to verbose logs being set false.', function (done) {
    let timerResetBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 8888,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }

      // don't kill the app until a GET request for the autokiller has been requested
      if (data.includes('GET /sfesfsefisoeo')) {
        testApp.send('stop')
      }

      // logs we should not see because verbose logs are shut off
      if (data.includes('app is still active, resetting timer')) {
        timerResetBool = true
      } else if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      } else if (data.includes('Killed process with PID')) {
        htmlValidatorPortClosedBool = true
      }
    })

    // on exit, check if the specific logs were outputted and that the validator was closed
    testApp.on('exit', () => {
      assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
      assert.equal(timerResetBool, false, 'auto Killer did not reset its timer when it checked if the app was closed while it was still opened')
      assert.equal(cannotConnectBool, false, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
      assert.equal(htmlValidatorPortClosedBool, false, 'The auto Killer did not kill the html Validator after the app was closed')
      done()
    })
  })
})
