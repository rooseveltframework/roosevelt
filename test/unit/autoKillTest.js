/* eslint-env mocha */

const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const assert = require('assert')

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

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: true
      },
      autoKillerTime: 1000,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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

    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
        assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
        assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
        done()
      }, 110000)
    })
  })

  it('should restart the timer if the app is still active when autoKiller goes to check if the app was closed and try to kill the Validator when the app is closed', function (done) {
    // vars to hold that a specific log was outputted
    let timerResetBool = false
    let htmlValidatorPortClosedBool = false
    let autoKillerStartedBool = false
    let cannotConnectBool = false

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: true
      },
      autoKillerTime: 1000,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      if (data.includes('There was no autoKiller running, creating a new one')) {
        autoKillerStartedBool = true
      }
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

    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(autoKillerStartedBool, true, 'Roosevelt did not start the autoKiller')
        assert.equal(timerResetBool, true, 'auto Killer did not reset its timer when it checked if the app was closed while it was still opened')
        assert.equal(cannotConnectBool, true, 'The auto Killer somehow kept on connecting with the app even thought it closed alreadly')
        assert.equal(htmlValidatorPortClosedBool, true, 'The auto Killer did not kill the html Validator after the app was closed')
        done()
      }, 110000)
    })
  })

  it('should default the auto Killer time to an hour if a time is not provided in the paramters and a package.json file is not present', function (done) {
    let hourLongWaitBool = false

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
      if (data.includes('Starting the auto Validator Killer, going to kill the validator in 3600 seconds if the app is not in use anymore')) {
        hourLongWaitBool = true
      }
    })

    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(hourLongWaitBool, true, 'Roosevelt did not grab the time that is in the default config file')
        done()
      }, 1000)
    })
  })

  it('should say that its restarting auto Killer if one is running and the app is being initialized again', function (done) {
    let restartAutoKillerLogBool = false

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlValidator: {
        enable: true,
        port: 42312,
        separateProcess: true
      },
      autoKillerTime: 1000,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      if (data.includes('Restarting autoKiller')) {
        restartAutoKillerLogBool = true
      }
    })

    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      setTimeout(() => {
        assert.equal(restartAutoKillerLogBool, true, 'Roosevelt did not restart the autoKiller even though one was open from the test before')
        done()
      }, 110000)
    })
  })
})
