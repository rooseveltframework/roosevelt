/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const http = require('http')
const os = require('os')
const path = require('path')
const request = require('supertest')

describe('Roosevelt.js Tests', function () {
  // directory for the test app
  const appDir = path.join(__dirname, 'app/rooseveltTest').replace('/\\/g', '/')

  // options to pass into test app generator
  let sOptions = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

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

  it('should compile and run what is on initServer even though we haven\'t passed a parameter object to roosevelt', function (done) {
    // generate the test app
    sOptions.appDir = './test/app'
    sOptions.method = 'initServer'
    generateTestApp(undefined, sOptions)

    const sampleJSON = {
      port: 43711,
      viewEngine: 'none',
      favicon: 'none'
    }

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we do get back an object of params, it means that roosevelt was able to complete its initialization
    testApp.on('message', (params) => {
      assert.strictEqual(params.port, sampleJSON.port, 'Roosevelt should make them the same if a param object is not passed in (port)')
      assert.strictEqual(params.viewEngine, sampleJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
      assert.strictEqual(params.favicon, sampleJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
      testApp.send('stop')
    })

    // finish the test on exit
    testApp.on('exit', () => {
      done()
    })
  })

  it('should only initialize the app once even though the startServer function is called after the initServer function', function (done) {
    // options to pass to generateTestApp
    sOptions.initStart = true
    sOptions.method = 'initServer'

    // counter to see how many times initServer was called
    let initServedLog = 0

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      onServerInit: '(app) => {console.log("Server initialized")}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream check to see how many times it logs that the server starts
    testApp.stdout.on('data', (data) => {
      if (data.includes('Server initialized')) {
        initServedLog++
      }
    })

    // on server start kill that app
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(initServedLog, 1, 'Roosevelt initialized the server either more or less then once')
      done()
    })
  })

  it('should only initialize the app once even though initServer is called twice', function (done) {
    // options to pass to generateTestApp
    sOptions.initStart = false
    sOptions.method = 'initServer'
    sOptions.initTwice = true

    // counter to see how many times initServer was called
    let initServedLog = 0

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerInit: '(app) => {console.log("Server initialized")}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream check to see how many times it logs that the server starts
    testApp.stdout.on('data', (data) => {
      if (data.includes('Server initialized')) {
        initServedLog++
      }
    })

    // when the server starts kill the app
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(initServedLog, 1, 'Roosevelt initialized the server either more or less then once')
      done()
    })
  })

  it('should allow the user to init Roosevelt without putting in a callback', function (done) {
    // generate the app.js file (no callback)
    sOptions.method = 'initServer'
    sOptions.empty = true
    sOptions.initTwice = false
    sOptions.stopServer = false

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false
    }, sOptions)

    // bool var to see that a message was not send back by a call back and that folders exists
    let messageRecievedBool = false

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      const test1 = fs.existsSync(path.join(appDir, 'mvc'))
      const test2 = fs.existsSync(path.join(appDir, 'public'))
      const test3 = fs.existsSync(path.join(appDir, 'statics'))
      assert.strictEqual(test1, true, 'Roosevelt did not make its mvc folder')
      assert.strictEqual(test2, true, 'Roosevelt did not make its public folder')
      assert.strictEqual(test3, true, 'Roosevelt did not make its statics folder')
      assert.strictEqual(messageRecievedBool, false, 'Roosevelt send back a message that was on the callback, even though one was not given')
      done()
    })
  })

  it('should allow the user to init Roosevelt and not run the callback param if it is not a function', function (done) {
    // bool var to see that a message was not send back by a call back and that folders exists
    let messageRecievedBool = false

    // create the app.js file (cb not a function)
    sOptions.method = 'initServer'
    sOptions.noFunction = true
    sOptions.empty = false
    sOptions.stopServer = false

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      const test1 = fs.existsSync(path.join(appDir, 'mvc'))
      const test2 = fs.existsSync(path.join(appDir, 'public'))
      const test3 = fs.existsSync(path.join(appDir, 'statics'))
      assert.strictEqual(test1, true, 'Roosevelt did not make its mvc folder')
      assert.strictEqual(test2, true, 'Roosevelt did not make its public folder')
      assert.strictEqual(test3, true, 'Roosevelt did not make its statics folder')
      assert.strictEqual(messageRecievedBool, false, 'Roosevelt send back a message that was on the callback, even though one was not given')

      // reset sOptions
      sOptions = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

      done()
    })
  })

  it('should be able to run the app in production mode', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false

    // generate a app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
    })

    // when the app starts, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.strictEqual(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      done()
    })
  })

  it('should be able to run the app with the localhostOnly param set to true and in production mode', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false

    // generate a app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      localhostOnly: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
    })

    // when the app starts, check that localhostOnly was set correctly and then kill it
    testApp.on('message', (params) => {
      assert.strictEqual(params.localhostOnly, true, 'Roosevelt did not set localhostOnly to true')
      if (productionModeBool) {
        testApp.send('stop')
      }
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.strictEqual(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      done()
    })
  })

  it('should not execute onServerStart if the value is not a function', function (done) {
    // bool var that will hold whether or not a message is recieved based on if a function was passed to onServerStart
    let serverStartFunctionBool = false

    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: 'something'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if a message was recieved, then it probably means that the onServerStart param has excuted and sent something
    testApp.on('message', () => {
      serverStartFunctionBool = true
      testApp.send('stop')
    })

    // since a message will not be recieved by the test suite, kill the app after a certain amount of time
    setTimeout(function () {
      testApp.send('stop')
    }, 4000)

    // on exit, test to see if a message was recieved by the test suite from the app
    testApp.on('exit', () => {
      assert.strictEqual(serverStartFunctionBool, false, 'Roosevelt still executed what was in onServerStart even though it is not a function')
      done()
    })
  })

  it('should be able to run the app with localhostOnly set to true, in production mode, and run an HTTPS server', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false
    let httpsServerMadeBool = false

    // generate a app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      localhostOnly: true,
      https: {
        enable: true,
        port: 43203,
        autoCert: false
      },
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        httpsServerMadeBool = true
      }
      if (httpsServerMadeBool) {
        testApp.send('stop')
      }
    })

    // when the app starts, check that localhostOnly was set correctly
    testApp.on('message', (params) => {
      assert.strictEqual(params.localhostOnly, true, 'Roosevelt did not set localhostOnly to true')
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.strictEqual(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      assert.strictEqual(httpsServerMadeBool, true, 'Roosevelt did not make a HTTPS server even though it is enabled')
      done()
    })
  })

  it('should warn and quit the initialization of the roosevelt app if another process is using the same port that the app was assigned to', function (done) {
    // bool var to hold whether or not specific logs were made or if a specific action happened
    let samePortWarningBool = false
    let serverStartedBool = false

    // create a dummy server that will give occupy the same port as the app
    const server = http.createServer(function (req, res) {
      res.statusCode = 200
      res.end()
    }).listen(43711)

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })
    testApp.stderr.on('data', (data) => {
      if (data.includes('Either kill that process or change this')) {
        samePortWarningBool = true
      }
    })

    // when the app starts, set the bool and kill the app
    testApp.on('message', () => {
      serverStartedBool = true
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(serverStartedBool, false, 'Roosevelt completely compiled the app and started it even thought we get EADDRINUSE error')
      assert.strictEqual(samePortWarningBool, true, 'Roosevelt did not report that it could not start because something is using the same port that the app wants to use')
      server.close()
      done()
    })
  })

  it('should be able to close an active connection when the app is closed', function (done) {
    // bool var to hold whether or not the request had finished
    let requestFinishedBool = false

    // copy the mvc folder to the test App
    const pathToMVC = path.join(__dirname, '/./util/mvc')
    const pathtoapp = path.join(appDir, '/mvc')
    fs.copySync(pathToMVC, pathtoapp)

    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, sOptions)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', (msg) => {
      // when the app finishes initialization, send a request to the server
      if (msg.port) {
        request(`http://localhost:${msg.port}`)
          .get('/longConn')
          .end((err) => {
            // if the connection is ended, see if it was because of an error or if it recieved a res object from the route
            if (err.code === 'ECONNRESET') {
              testApp.send('stop')
            } else {
            // if the app returns a res object, it means that the connection wasn't close when the server closed
              requestFinishedBool = true
              testApp.send('stop')
            }
          })
      } else {
        // when the request sends back a msg, kill the app
        testApp.send('stop')
      }
    })

    // on exit, check if the connection was closed because it finished or by the server closing
    testApp.on('exit', () => {
      assert.strictEqual(requestFinishedBool, false, 'Roosevelt did not destroy the active connection when it shut down')
      done()
    })
  })

  it('should be able to use server close instead of exiting process with an HTTP server', function (done) {
    // set test app features
    sOptions.exitProcess = true
    sOptions.close = true
    sOptions.serverType = 'httpServer'

    // bool variable to check if the server closed but the process is still runinng
    let processRunningBool = false

    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen on the logs to see if the https server is initialized
    testApp.stdout.on('data', (data) => {
      if (data.includes('HTTP server listening')) {
        testApp.send('stop')
      }
      if (data.includes('successfully closed all connections') && testApp.connected === true) {
        processRunningBool = true
      }
    })

    // on exit, check if roosevelt closed the https server and kept the process running
    testApp.on('exit', () => {
      assert.strictEqual(processRunningBool, true, 'The HTTP server did not close and keep the process running')
      done()
    })
  })

  it('should be able to use server close instead of exiting process with an HTTPS server', function (done) {
    // set the server type
    sOptions.close = true
    sOptions.serverType = 'httpsServer'

    // bool variable to check if the server closed but the process is still runinng
    let processRunningBool = false

    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      https: {
        enable: true,
        port: 43203,
        force: true,
        autoCert: false
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen on the logs to see if the https server is initialized
    testApp.stdout.on('data', (data) => {
      if (data.includes('HTTPS server listening')) {
        testApp.send('stop')
      }
      if (data.includes('successfully closed all connections') && testApp.connected === true) {
        processRunningBool = true
      }
    })

    // on exit, check if roosevelt closed the https server and kept the process running
    testApp.on('exit', () => {
      assert.strictEqual(processRunningBool, true, 'The HTTPS server did not close and keep the process running')
      done()
    })
  })
})
