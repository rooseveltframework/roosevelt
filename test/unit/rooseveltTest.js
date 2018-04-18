/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const os = require('os')
const request = require('supertest')
const http = require('http')

describe('Roosevelt roosevelt.js Section Tests', function () {
  const appDir = path.join(__dirname, '../', 'app', 'rooseveltTest').replace('/\\/g', '/')

  // options that would be put into generateTestApp params
  let sOptions = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should stil compile and run what is on initServer even when we do not pass a param object to roosevelt', function (done) {
    // generate a empty app.js file
    sOptions.appDir = appDir
    sOptions.method = 'initServer'
    sOptions.empty = false
    sOptions.noFunction = false

    generateTestApp(undefined, sOptions)

    // read the default config file
    let defaults = fse.readFileSync(path.join(appDir, '../', '../', '../', 'lib', 'defaults', 'config.json')).toString('utf8')
    let defaultsJSON = JSON.parse(defaults)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // if we do get back an object of params, it means that roosevelt was able to complete its initialization
    testApp.on('message', (params) => {
      assert.equal(params.port, defaultsJSON.port, 'Roosevelt should make them the same if a param object is not passed in (port)')
      assert.equal(params.viewEngine, defaultsJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
      assert.equal(params.favicon, defaultsJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
      testApp.kill('SIGINT')
    })

    // finish the test on exit
    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to init Roosevelt without putting in a callback', function (done) {
    // generate the app.js file (no callback)
    sOptions.method = 'initServer'
    sOptions.empty = true
    sOptions.noFunction = false

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true
    }, sOptions)
    // bool var to see that a message was not send back by a call back and that folders exists
    let messageRecievedBool = false

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      let test1 = fse.existsSync(path.join(appDir, 'mvc'))
      let test2 = fse.existsSync(path.join(appDir, 'public'))
      let test3 = fse.existsSync(path.join(appDir, 'statics'))
      assert.equal(test1, true, 'Roosevelt did not make its mvc folder')
      assert.equal(test2, true, 'Roosevelt did not make its public folder')
      assert.equal(test3, true, 'Roosevelt did not make its statics folder')
      assert.equal(messageRecievedBool, false, 'Roosevelt send back a message that was on the callback, even though one was not given')
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

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      let test1 = fse.existsSync(path.join(appDir, 'mvc'))
      let test2 = fse.existsSync(path.join(appDir, 'public'))
      let test3 = fse.existsSync(path.join(appDir, 'statics'))
      assert.equal(test1, true, 'Roosevelt did not make its mvc folder')
      assert.equal(test2, true, 'Roosevelt did not make its public folder')
      assert.equal(test3, true, 'Roosevelt did not make its statics folder')
      assert.equal(messageRecievedBool, false, 'Roosevelt send back a message that was on the callback, even though one was not given')
      done()
    })
  })

  it('should allow the user to change the amount of cores that the app will run on', function (done) {
    // reset sOptions
    sOptions = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

    // Int vars to hold how many times a server was started and how many times a thread was killed
    let serverStartInt = 0
    let processKilledInt = 0

    // set a timeout in case the correct amount of instances are not made or something fails during initialization
    let timeout = setTimeout(function () {
      assert.fail('An error occurred during initiailization or the app did not start enough instances of the app based on the command line arguement')
      done()
    }, 5000)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', '2'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the output to kill the app when the amount of server instances equal to the amount of cores used and keep track of the amount of threads killed
    testApp.stdout.on('data', (data) => {
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === 2) {
          testApp.kill('SIGINT')
          clearTimeout(timeout)
        }
      }
      if (data.includes('thread') && data.includes('died')) {
        processKilledInt++
      }
    })

    // on exit, check how many instances of the app server were made, synonymous with how many cores have been used
    testApp.on('exit', () => {
      assert.equal(processKilledInt, 2, 'Roosevelt did not kill all the cluster workers that it generated')
      done()
    })
  })

  it('should make the app use the max amount of cpu cores if the user passes in the command line argument "-c max"', function (done) {
    // set a timeout in case the correct amount of instances are not made or something fails during initialization
    let timeout = setTimeout(function () {
      assert.fail('An error occurred during initiailization or the app did not start enough instances of the app based on the command line arguement')
      done()
    }, 5000)

    // Int vars to hold how many times a server was started, how many cpu cores this enviroment has and how many times a process was killed
    let serverStartInt = 0
    let processKilledInt = 0
    const maxCores = os.cpus().length

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', 'max'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check output logs to kill the app when the server instances reach the max and keep track of all the thread that are killed
    testApp.stdout.on('data', (data) => {
      if (data.includes('server started')) {
        serverStartInt++
        if (serverStartInt === maxCores) {
          testApp.kill('SIGINT')
          clearTimeout(timeout)
        }
      }
      if (data.includes('thread') && data.includes('died')) {
        processKilledInt++
      }
    })

    // on exit, check if the app had killed the cluster that the app had created
    testApp.on('exit', () => {
      assert.equal(processKilledInt, maxCores, 'Roosevelt did not kill all the cluster workers that it generated')
      done()
    })
  })

  it('should make the app default to one core if the number of cores the user asked is more than what the enviroment has', function (done) {
    // bool var to hold whether a specific error was logged, how many cpu cores this enviroment has, and a var to hold what one above the amount of cores that exists
    let defaultCoresLogBool = false
    let serverStartInt = 0
    const maxCores = os.cpus().length
    const tooManyCores = maxCores + 1

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', `${tooManyCores}`], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the output logs to see how many times the app makes a server instance
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTP server listening on port')) {
        serverStartInt++
      }
    })

    // on error logs, see if the app will default to one core
    testApp.stderr.on('data', (data) => {
      if (data.includes('Defaulting to 1 core.')) {
        defaultCoresLogBool = true
      }
    })

    // on start, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, see if the app reports it will use one core and that it only started one instance of the app
    testApp.on('exit', () => {
      assert.equal(defaultCoresLogBool, true, 'Roosevelt try to set the amount of cores to something that is not possible (too many)')
      assert.equal(serverStartInt, 1, 'Roosevelt started more or less than 1 server for the app')
      done()
    })
  })

  it('should make the app default to one core if the number of cores the user asked is less or equal to zero', function (done) {
    // bool var to hold whether a specific error was logged, how many cpu cores this enviroment has, and a var to hold what one above the amount of cores that exists
    let defaultCoresLogBool = false
    let serverStartInt = 0

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', `0`], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the output logs to see how many times the app makes a server instance
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTP server listening on port')) {
        serverStartInt++
      }
    })

    // check the error logs to see if the app will default to one core
    testApp.stderr.on('data', (data) => {
      if (data.includes('Defaulting to 1 core.')) {
        defaultCoresLogBool = true
      }
    })

    // on start, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, see if the app reports it will use one core and that it only started one instance of the app
    testApp.on('exit', () => {
      assert.equal(defaultCoresLogBool, true, 'Roosevelt try to set the amount of cores to something that is not possible (too many)')
      assert.equal(serverStartInt, 1, 'Roosevelt started more or less than 1 server for the app')
      done()
    })
  })

  it('should destroy all connections made to server if they still exists when the app is shutting down', function (done) {
    // global var to hold supertest and bool var to show whether or not a error log was outputted
    let test
    let statusUnknownBool = false

    // copy over the mvc over to the test app directory so that we can make http request
    fse.ensureDir(appDir)
    fse.copySync(path.join(appDir, '../', '../', 'util', 'mvc'), path.join(appDir, 'mvc'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on start, make a request to the server before immediately quitting
    testApp.on('message', (params) => {
      test = request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            if (err.message.includes(`Cannot read property 'status' of undefined`)) {
              statusUnknownBool = true
            }
          }
        })
      testApp.kill('SIGINT')
    })

    // on exit, see if the response can't be finish and that the request's socket was destroyed
    testApp.on('exit', () => {
      assert.equal(test.req.socket.destroyed, true, 'Roosevelt did not destory the connection while it was closing down')
      assert.equal(statusUnknownBool, true, 'Roosevelt was able to complete the HTTP Request, which it should not be able to do')
      done()
    })
  })

  it('should be able to make a https server if it is enabled', function (done) {
    // bool var to see if a specific log was outputted
    let httpsServerMadeBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43203
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // listen on the logs to see if the https server is initialized
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        httpsServerMadeBool = true
      }
    })

    // when the app starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on exit, check if roosevelt made a https server or not
    testApp.on('exit', () => {
      assert.equal(httpsServerMadeBool, true, 'Roosevelt did not make the HTTPS server even though it was enabled')
      done()
    })
  })

  it('should only make a https server if it is enabled and httpsOnly param is true', function (done) {
    // bool var to see if specifics log was outputted
    let httpsServerMadeBool = false
    let httpServerMadeBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43203,
        httpsOnly: true
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // Check the logs to see which type of server was made
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        httpsServerMadeBool = true
      }
      if (data.includes('Roosevelt Express HTTP server listening on port')) {
        httpServerMadeBool = true
      }
    })

    // when the app starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on exit, see if the app made a https server and not a http server
    testApp.on('exit', () => {
      assert.equal(httpsServerMadeBool, true, 'Roosevelt did not make the HTTPS server even though it was enabled')
      assert.equal(httpServerMadeBool, false, 'Roosevelt made a http Server even though the httpsOnly param is true')
      done()
    })
  })

  it('should be able to run the app in production mode', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false

    // generate a app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
    })

    // when the app starts, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.equal(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      done()
    })
  })

  it('should be able to run the app even with the localhostOnly param set to true and in production mode', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false

    // generate a app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      localhostOnly: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
    })

    // when the app starts, check that localhostOnly was set correctly and then kill it
    testApp.on('message', (params) => {
      assert.equal(params.localhostOnly, true, 'Roosevelt did not set localhostOnly to true')
      testApp.kill('SIGINT')
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.equal(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      done()
    })
  })

  it('should be able to run the app even with the localhostOnly param set to true, in production mode and run a https server', function (done) {
    // bool var to hold whether a specific log was outputted
    let productionModeBool = false
    let httpsServerMadeBool = false

    // generate a app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      localhostOnly: true,
      https: {
        enable: true,
        httpsPort: 43203
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test to see if the app is being run in production mode
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode...')) {
        productionModeBool = true
      }
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        httpsServerMadeBool = true
      }
    })

    // when the app starts, check that localhostOnly was set correctly and then kill it
    testApp.on('message', (params) => {
      assert.equal(params.localhostOnly, true, 'Roosevelt did not set localhostOnly to true')
      testApp.kill('SIGINT')
    })

    // on exit, see if the app started in production mode
    testApp.on('exit', () => {
      assert.equal(productionModeBool, true, 'Roosevelt did not start in production mode even though the production flag was passed to it as a command line arg')
      assert.equal(httpsServerMadeBool, true, 'Roosevelt did not make a HTTPS server even thought it is enabled')
      done()
    })
  })

  it('should not execute whatever is in onServerStart if the param passed to it is not a function', function (done) {
    // bool var that will hold whether or not a message is recieved based on if a function was passed to onServerStart
    let serverStartFunctionBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `something`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // if a message was recieved, then it probably means that the onServerStart param has excuted and sent something
    testApp.on('message', () => {
      serverStartFunctionBool = true
      testApp.kill('SIGINT')
    })

    // since a message will not be recieved by the test suite, kill the app after a certain amount of time
    setTimeout(function () {
      testApp.kill('SIGINT')
    }, 4000)

    // on exit, test to see if a message was recieved by the test suite from the app
    testApp.on('exit', () => {
      assert.equal(serverStartFunctionBool, false, 'Roosevelt still executed what was in onServerStart even though it is not a function')
      done()
    })
  })

  it('should be able to start the app as a https server without the passphrase or ca', function (done) {
    // bool var to hold that the HTTPS server is listening
    let HTTPSServerListeningBool = false

    // path to key and cert in util
    let pathToKey = path.join(`${__dirname}/../util/test.req.key`)
    let pathToCert = path.join(`${__dirname}/../util/test.req.crt`)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43733,
        passphrase: undefined,
        ca: undefined,
        keyPath: {key: pathToKey, cert: pathToCert}
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check to see if the specific log was outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        HTTPSServerListeningBool = true
      }
    })

    // when the app finishes initialization and starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on the apps exit, see of the HTTPS server was listening
    testApp.on('exit', () => {
      assert.equal(HTTPSServerListeningBool, true, 'Roosevelt did not make a HTTPS Server')
      done()
    })
  })

  it('should be able to start the app as a https server with a passphrase', function (done) {
    // bool var to hold that the HTTPS server is listening
    let HTTPSServerListeningBool = false

    // path to key and cert in util
    let pathToKey = path.join(`${__dirname}/../util/test.req.key`)
    let pathToCert = path.join(`${__dirname}/../util/test.req.crt`)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43733,
        passphrase: 'something',
        keyPath: {key: pathToKey, cert: pathToCert}
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check to see if the specific log was outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        HTTPSServerListeningBool = true
      }
    })

    // when the app finishes initialization and starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on the apps exit, see of the HTTPS server was listening
    testApp.on('exit', () => {
      assert.equal(HTTPSServerListeningBool, true, 'Roosevelt did not make a HTTPS Server')
      done()
    })
  })

  it('should be able to start the server even if a ca string is passed in', function (done) {
    // bool var to hold that the HTTPS server is listening
    let HTTPSServerListeningBool = false

    // path to key and cert in util
    let pathToKey = path.join(`${__dirname}/../util/test.req.key`)
    let pathToCert = path.join(`${__dirname}/../util/test.req.crt`)

    // path to ca file
    let pathToCA = path.join(`${__dirname}/../util/ca.crt`)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43733,
        keyPath: {key: pathToKey, cert: pathToCert},
        ca: pathToCA,
        cafile: true
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check to see if the specific log was outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        HTTPSServerListeningBool = true
      }
    })

    // when the app finishes initialization and starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on the apps exit, see of the HTTPS server was listening
    testApp.on('exit', () => {
      assert.equal(HTTPSServerListeningBool, true, 'Roosevelt did not make a HTTPS Server')
      done()
    })
  })

  it('should be able to start the server even if a ca array is passed in', function (done) {
    // bool var to hold that the HTTPS server is listening
    let HTTPSServerListeningBool = false

    // path to key and cert in util
    let pathToKey = path.join(`${__dirname}/../util/test.req.key`)
    let pathToCert = path.join(`${__dirname}/../util/test.req.crt`)

    // path to ca files
    let pathToCA = path.join(`${__dirname}/../util/ca.crt`)
    let pathToCA2 = path.join(`${__dirname}/../util/ca-2.crt`)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43733,
        keyPath: {key: pathToKey, cert: pathToCert},
        ca: [pathToCA, pathToCA2],
        cafile: true
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check to see if the specific log was outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        HTTPSServerListeningBool = true
      }
    })

    // when the app finishes initialization and starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on the apps exit, see of the HTTPS server was listening
    testApp.on('exit', () => {
      assert.equal(HTTPSServerListeningBool, true, 'Roosevelt did not make a HTTPS Server')
      done()
    })
  })

  it('should be able to start the server even if a ca passed in is not a string or array and cafile is set to true', function (done) {
    // bool var to hold that the HTTPS server is listening
    let HTTPSServerListeningBool = false

    // path to key and cert in util
    let pathToKey = path.join(`${__dirname}/../util/test.req.key`)
    let pathToCert = path.join(`${__dirname}/../util/test.req.crt`)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      https: {
        enable: true,
        httpsPort: 43733,
        keyPath: {key: pathToKey, cert: pathToCert},
        ca: 32,
        cafile: true
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on logs, check to see if the specific log was outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTPS server listening on port')) {
        HTTPSServerListeningBool = true
      }
    })

    // when the app finishes initialization and starts, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // on the apps exit, see of the HTTPS server was listening
    testApp.on('exit', () => {
      assert.equal(HTTPSServerListeningBool, true, 'Roosevelt did not make a HTTPS Server')
      done()
    })
  })

  it('should warn and quit the initialization of the roosevelt app if another process is using the same port that the app was assigned to', function (done) {
    // bool var to hold whether or not specific logs were made or if a specific action happened
    let samePortWarningBool = false
    let serverStartedBool = false

    // create a dummy server that will give occupy the same port as the app
    let server = http.createServer(function (req, res) {
      res.statusCode = 200
      res.end()
    }).listen(43711)

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
    testApp.stderr.on('data', (data) => {
      if (data.includes('Either kill that process or change this')) {
        samePortWarningBool = true
      }
    })

    testApp.on('message', () => {
      serverStartedBool = true
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      assert.equal(serverStartedBool, false, 'Roosevelt completely compiled the app and started it even thought we get EADDRINUSE error')
      assert.equal(samePortWarningBool, true, 'Roosevelt did not report that it could not start because something is using the same port that the app wants to use')
      server.close()
      done()
    })
  })

  it('should throw the error message if it has an error code that is not the three codes found in roosevelt.js', function (done) {
    // bool var to hold whether a specific log was outputted
    let rangeErrorLogBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      port: 70000
    }, sOptions)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // watch error logs for the specific log that we are testing for
    testApp.stderr.on('data', (data) => {
      if (data.includes('RangeError [ERR_SOCKET_BAD_PORT]: Port should be > 0 and < 65536. Received 70000')) {
        rangeErrorLogBool = true
      }
    })

    // on startup, if we get there somehow, kill the app
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // on exit, check to see if the specific log was made and finish the test
    testApp.on('exit', () => {
      assert.equal(rangeErrorLogBool, true, `Roosevelt did not throw an error saying that the user's server port is too high`)
      done()
    })
  })
})
