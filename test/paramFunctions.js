/* eslint-env mocha */

const assert = require('assert')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')

describe('Parameter Function Tests', () => {
  // path to the app Directory
  const appDir = path.join(__dirname, 'app/paramFunctionTest')

  // specify the options that will be passed to the generateTestApp
  const options = { rooseveltPath: '../../../roosevelt', stopServer: true }

  beforeEach(() => {
    // start by copying the alreadly made mvc directory into the app directory
    fs.copySync(path.join(__dirname, 'util/mvc'), path.join(appDir, 'mvc'))
  })

  // delete the test app Directory and start with a clean state after each test
  afterEach(async () => {
    await fs.remove(appDir)
  })

  it('should execute what is in onServerInit', done => {
    // bool vars to hold whether or not the app had returned what is given to them, and if we can access the server
    let serverInitLogBool = false
    let messageCounter = 0

    // generate the app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerInit: '(app) => {process.send("something")}'
    }, {
      ...options,
      method: 'initServer'
    })

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server has finished initialization, try to access the server or see if the message is the word that is suppose to be given back
    testApp.on('message', message => {
      messageCounter++
      if (message === 'something') {
        serverInitLogBool = true
      }
      if (messageCounter === 2) {
        testApp.send('stop')
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(serverInitLogBool, true, 'Roosevelt did not execute what is in onServerInit')
      done()
    })
  })

  it('should execute onAppExit', done => {
    let serverExitBool

    // generate the app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onAppExit: '(app) => {process.send("the big exit")}'
    }, {
      ...options,
      method: 'initServer'
    })

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server has finished initialization, try to access the server or see if the message is the word that is suppose to be given back
    testApp.on('message', message => {
      if (message === 'the big exit') {
        serverExitBool = true
      } else {
        testApp.send('stop')
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(serverExitBool, true, 'onAppExit did not execute')
      done()
    })
  })

  it('should throw an error if there is a controller that is not coded properly in the mvc', done => {
    // bool var to hold whether or not the controller errors logs are outputted
    let controllerErrorLogBool = false

    // put the err Controller into the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))

    // create the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false
    }, {
      ...options,
      method: 'initServer'
    })

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen to the error logs and see if one about the night being dark and full of error pops up
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to load controller file')) {
        controllerErrorLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the two error logs were outputted
    testApp.on('exit', () => {
      assert.strictEqual(controllerErrorLogBool, true, 'Roosevelt did not toss a comment to show which controller is wrong')
      done()
    })
  })

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', done => {
    // bool var to hold whether or not the 404 load error was logged
    let error404LoadLogBool = false

    // copy the 404 error page to the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))

    // create the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      errorPages: {
        notFound: '404errController.js'
      }
    }, {
      ...options,
      method: 'initServer'
    })

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the 404 load error was outputted
    testApp.stderr.on('data', data => {
      if (data.includes('failed to load 404 controller file')) {
        error404LoadLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the 404 load errors were logged
    testApp.on('exit', () => {
      assert.strictEqual(error404LoadLogBool, true, 'Roosevelt did not toss an error when there is a syntax error with the custom 404 controller file')
      done()
    })
  })
})
