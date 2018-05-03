/* eslint-env mocha */

const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const assert = require('assert')
const fse = require('fs-extra')
const fkill = require('fkill')
const os = require('os')
const http = require('http')

describe('Roosevelt autokill Test', function () {
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

  it('should kill the htmlValidator if it is seperate, enabled and the app closed down', function (done) {
    // bool var to hold whether a specific log was outputted
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      suppressLogs: {
        verboseLogs: false
      },
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check if specific logs were outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Killed process on port: 42312')) {
        htmlValidatorPortClosedBool = true
      }
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }
      if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      }
    })

    // when the app finishes initiailization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, give some time for auto Killer to run its course and then check to see if the logs we want were outputted or not
    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
        assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
        assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
        done()
      }, 100000)
    })
  })

  it('should restart the timer if the app is still active when autoKiller goes to check if the app was closed and try to kill the Validator when the app is closed', function (done) {
    // vars to hold whether or not a specific log was outputted
    let timerResetBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        verboseLogs: false
      },
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console logs, check if sepcific logs were outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }
      // on this specific log, kill the app
      if (data.includes('app is still active, resetting timer')) {
        timerResetBool = true
        testApp.kill('SIGINT')
      }
      if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      }
      if (data.includes('Killed process on port: 42312')) {
        htmlValidatorPortClosedBool = true
      }
    })

    // on exit, check if the specific logs were outputted
    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
        assert.equal(timerResetBool, true, 'auto Killer did not reset its timer when it checked if the app was closed while it was still opened')
        assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
        assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
        done()
      }, 100000)
    })
  })

  it('should default the auto Killer time to an hour if a time is not provided in the paramters and a package.json file is not present', function (done) {
    // bool var to hold whether or not a specific log was outputted
    let hourLongWaitBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        verboseLogs: false
      },
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: {
          enable: true
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check whether specific logs were outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting the auto Validator Killer, going to kill the validator in 3600 seconds if the app is not in use anymore')) {
        hourLongWaitBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, give auto Killer time to complete and then check to see if specific logs were made
    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(hourLongWaitBool, true, 'Roosevelt did not grab the time that is in the default config file')
        done()
      }, 1000)
    })
  })

  it('should say that its restarting auto Killer if one is running and the app is being initialized again', function (done) {
    // bool var to hold whether or not a speicific log was made
    let restartAutoKillerLogBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        verboseLogs: false
      },
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console.logs, check to see if specific logs were made
    testApp.stdout.on('data', (data) => {
      if (data.includes('Restarting autoKiller')) {
        restartAutoKillerLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, give some time for auto kill Validator to finish and then check to see if specific logs were made
    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(restartAutoKillerLogBool, true, 'Roosevelt did not restart the autoKiller even though one was open from the test before')
        done()
      }, 100000)
    })
  })

  it('should be able to say that there is no autoKiller and that it is starting a new one if the roosevelt_validator_pid.txt file exsist, but the process is alreadly dead', function (done) {
    // bool var to hold whether or not a specific log was outputted
    let noAutoKillerFromPIDBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        verboseLogs: false
      },
      htmlValidator: {
        enable: true,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 10000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // give enough time for the auto Validator to start before exiting the roosevelt app
    testApp.on('message', () => {
      setTimeout(() => {
        testApp.kill('SIGINT')
      }, 3000)
    })

    testApp.on('exit', () => {
      // kill the autoValidator from the first roosevelt app
      const PIDFilePath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
      let content = fse.readFileSync(PIDFilePath).toString('utf8')
      let PID = parseInt(content)
      fkill(PID, {force: true}).then(() => {
        // create a second App
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        // check the console logs to see if our message was outputted
        testApp2.stdout.on('data', (data) => {
          if (data.includes('There was no autoKiller running with the PID given, creating a new one')) {
            noAutoKillerFromPIDBool = true
          }
        })

        // when its finish with initialization, kill it
        testApp2.on('message', () => {
          testApp2.kill('SIGINT')
        })

        // when the app is killed, wait for the auto Killer to finish its process before calling done
        testApp2.on('exit', () => {
          setTimeout(() => {
            assert.equal(noAutoKillerFromPIDBool, true, 'The auto Killer was not started after there was no process found with the given PID')
            done()
          }, 100000)
        })
      })
    })
  })

  it('should restart the timer if the app is still active when autoKiller goes to check if the app was closed and try to kill the Validator when the app is closed, but does not report anything if verboseLogs is true', function (done) {
    // vars to hold whether or not a specific log was outputted
    let timerResetBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: {
          enable: true,
          autoKillerTimeout: 1000
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console logs, check if sepcific logs were outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }
      // on this specific log, kill the app
      if (data.includes('Roosevelt Express HTTP server listening on port')) {
        setTimeout(() => {
          testApp.kill('SIGINT')
        }, 3000)
      }
      if (data.includes('app is still active, resetting timer')) {
        timerResetBool = true
      }
      if (data.includes('cannot connect to app, killing the validator now')) {
        cannotConnectBool = true
      }
      if (data.includes('Killed process on port: 42312')) {
        htmlValidatorPortClosedBool = true
      }
    })

    // on exit, check if the specific logs were outputted and that the validator was closed
    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
        assert.equal(timerResetBool, false, 'auto Killer did not reset its timer when it checked if the app was closed while it was still opened')
        assert.equal(cannotConnectBool, false, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
        assert.equal(htmlValidatorPortClosedBool, false, 'The auto Killer did not kill the html Validator after the app was closed')
        // options to pass into the http GET request
        let options = {
          url: 'http://localhost',
          method: 'GET',
          port: 42312,
          headers: {
            'User-Agent': 'request'
          }
        }
        // after the timeout period, send a http request
        http.get(options, function (res) {
          const { statusCode } = res
          // if we get any sort of statusCode, whether it be 404, 200 etc, then that means the app is still active and that the timer should reset
          if (statusCode) {
            assert.fail('we got a response from a validator that is suppose to be close')
            done()
          }
          // if we get an error, likely that the connection is close and is safe to try to close the validator
        }).on('error', () => {
          done()
        })
      }, 100000)
    })
  })
})
