/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Parameter Function Tests', function () {
  // path to the app Directory
  const appDir = path.join(__dirname, 'app/paramFunctionTest')

  // specify the options that will be passed to the generateTestApp
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fs.copySync(path.join(__dirname, 'util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  // delete the test app Directory and start with a clean state after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should execute what is in onServerInit', function (done) {
    // bool vars to hold whether or not the app had returned what is given to them, and if we can access the server
    let serverInitLogBool = false
    let messageCounter = 0
    // change what options method is for this test
    options.method = 'initServer'

    // generate the app
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onServerInit: '(app) => {process.send("something")}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server has finished initialization, try to access the server or see if the message is the word that is suppose to be given back
    testApp.on('message', (message) => {
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

  it('should execute onAppExit', function (done) {
    let serverExitBool
    options.method = 'initServer'

    // generate the app
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onAppExit: '(app) => {process.send("the big exit")}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server has finished initialization, try to access the server or see if the message is the word that is suppose to be given back
    testApp.on('message', (message) => {
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

  it('should execute what is in onReqStart', function (done) {
    // bool var to hold whether or not the app had used its body parser middleware yet
    let bodyParserNotUsedBool = false

    // make options method go back to what it once was
    options.method = 'startServer'

    // generate the app
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onReqStart: '(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the console logs to see if the req body that will be logged out has a value or if its undefined
    testApp.stdout.on('data', (data) => {
      if (data.includes('body: undefined')) {
        bodyParserNotUsedBool = true
      }
    })

    // when the app starts and sends the message that "ServerStart", send a request and see if I get another message saying "ReqStart"
    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .post('/paramPost')
        .send({ name: 'Bob' })
        .send({ age: '3' })
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the app is about to exit, check if the bool is true
    testApp.on('exit', () => {
      assert.strictEqual(bodyParserNotUsedBool, true, 'The Response that we got back from onReqStart shows that middleware was used before it was hit')
      done()
    })
  })

  it('should execute what is in onReqBeforeRoute', function (done) {
    // bool var to hold whether or not the app had used its body parser middleware yet
    let bodyParserUsedBool = false

    // generate the app
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onReqBeforeRoute: '(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the console logs to see if the req body that will be logged out has a value or if its undefined
    testApp.stdout.on('data', (data) => {
      if (data.includes('body: {"name":"Bob","age":"3"}')) {
        bodyParserUsedBool = true
      }
    })

    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .post('/paramPost')
        .send({ name: 'Bob' })
        .send({ age: '3' })
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(bodyParserUsedBool, true, 'The Response that we got back from onReqStart shows that middleware was not used before it was hit')
      done()
    })
  })

  it('should execute what is in onReqAfterRoute', function (done) {
    // two bool to check if res.text has a value in it
    let resHeaderUndefinedBool = false
    let resHeaderValueBool = false

    // generate the app
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onReqAfterRoute: '(req, res) => {console.log("Testing after: " + res.Testing)}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes('Testing before: undefined')) {
        resHeaderUndefinedBool = true
      }
      if (data.includes('Testing after: someValue')) {
        resHeaderValueBool = true
      }
    })

    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .get('/paramPostAfter')
        .accept('application/json')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
          }
          testApp.send('stop')
        })
    })

    // when the app is about to exit, check if both bool values are true
    testApp.on('exit', () => {
      assert.strictEqual(resHeaderUndefinedBool, true, 'response header should have no value as it was not assigned yet')
      assert.strictEqual(resHeaderValueBool, true, 'response heade should have a value since it was assigned in route')
      done()
    })
  })

  it('should throw an error if there is a controller that is not coded properly in the mvc', function (done) {
    // bool var to hold whether or not the controller errors logs are outputted
    let controllerErrorLogBool = false

    // put the err Controller into the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))

    // create the app.js file
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

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

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', function (done) {
    // bool var to hold whether or not the 404 load error was logged
    let error404LoadLogBool = false

    // copy the 404 error page to the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))

    // create the app.js file
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      errorPages: {
        notFound: '404errController.js'
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the 404 load error was outputted
    testApp.stderr.on('data', (data) => {
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

  it('should skip over elements that are not files when loading in controllers', function (done) {
    // reference list of routes to compare against
    const referenceRoutes = [
      '/controller1',
      '/controller2'
    ]

    // copy the mvc over to the app
    fs.copySync(path.join(appDir, '../.././util/mvc'), path.join(appDir, 'mvc'))

    // make a directory in the mvc
    fs.mkdirSync(path.join(appDir, 'mvc/controllers/test'))

    // create the app.js file
    generateTestApp({
      appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("routes"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app is finished with its initialization, kill it
    testApp.on('message', (routes) => {
      // check that routes in controllers have been populated in the app
      assert(routes.length > 0)

      // check app's routes against reference list
      referenceRoutes.forEach(route => {
        assert(routes.includes(route))
      })

      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
