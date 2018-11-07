/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const http = require('http')
const os = require('os')
const path = require('path')
const request = require('supertest')
const { spawnSync } = require('child_process')

describe('Roosevelt.js Tests', function () {
  // directory for the test app
  const appDir = path.join(__dirname, '../app/rooseveltTest').replace('/\\/g', '/')

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
    sOptions.appDir = appDir
    sOptions.method = 'initServer'
    generateTestApp(undefined, sOptions)

    // read the default config file
    let defaults = fse.readFileSync(path.join(appDir, '../../../lib/defaults/config.json')).toString('utf8')
    let defaultsJSON = JSON.parse(defaults)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we do get back an object of params, it means that roosevelt was able to complete its initialization
    testApp.on('message', (params) => {
      assert.strictEqual(params.port, defaultsJSON.port, 'Roosevelt should make them the same if a param object is not passed in (port)')
      assert.strictEqual(params.viewEngine, defaultsJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
      assert.strictEqual(params.favicon, defaultsJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
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
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      onServerInit: `(app) => {console.log("Server initialized")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true,
      onServerInit: `(app) => {console.log("Server initialized")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true
    }, sOptions)

    // bool var to see that a message was not send back by a call back and that folders exists
    let messageRecievedBool = false

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      let test1 = fse.existsSync(path.join(appDir, 'mvc'))
      let test2 = fse.existsSync(path.join(appDir, 'public'))
      let test3 = fse.existsSync(path.join(appDir, 'statics'))
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
      appDir: appDir,
      generateFolderStructure: true
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // if we recieve a message from roosevelt, which is only from a callback, turn that bool to true
    testApp.on('message', () => {
      messageRecievedBool = true
    })

    // when the app is finished, check that the initialized folder are there and that a message was not recieved from the app based on the callback
    testApp.on('exit', () => {
      let test1 = fse.existsSync(path.join(appDir, 'mvc'))
      let test2 = fse.existsSync(path.join(appDir, 'public'))
      let test3 = fse.existsSync(path.join(appDir, 'statics'))
      assert.strictEqual(test1, true, 'Roosevelt did not make its mvc folder')
      assert.strictEqual(test2, true, 'Roosevelt did not make its public folder')
      assert.strictEqual(test3, true, 'Roosevelt did not make its statics folder')
      assert.strictEqual(messageRecievedBool, false, 'Roosevelt send back a message that was on the callback, even though one was not given')
      done()
    })
  })

  it('should allow the user to change the amount of cores that the app will run on ("-c")', function (done) {
    // reset sOptions
    sOptions = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

    // int vars to hold how many times a server was started and how many times a thread was killed
    let serverStartInt = 0
    let processKilledInt = 0

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', '1.1'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output to kill the app when the amount of server instances equal to the amount of cores used and keep track of the amount of threads killed
    testApp.stdout.on('data', (data) => {
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === 1) {
          testApp.send('stop')
        }
      }
      if (data.includes(`thread`) && data.includes(`died`)) {
        processKilledInt++
      }
    })

    // on exit, check how many instances of the app server were made, synonymous with how many cores have been used
    testApp.on('exit', () => {
      assert.strictEqual(processKilledInt, 1, 'Roosevelt did not kill all the cluster workers that it generated')
      done()
    })
  })

  it('should allow the user to change the amount of cores that the app will run on ("--cores")', function (done) {
    // int vars to hold how many times a server was started and how many times a thread was killed
    let serverStartInt = 0

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '--cores', '2'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output to kill the app when the amount of server instances equal to the amount of cores used and keep track of the amount of threads killed
    testApp.stdout.on('data', (data) => {
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === 2) {
          testApp.send('stop')
        }
      }
      if (data.includes('Roosevelt Express successfully closed all connections')) {
        exit()
      }
    })

    // on exit, check how many instances of the app server were made, synonymous with how many cores have been used
    function exit () {
      assert.strictEqual(serverStartInt, 2, 'Roosevelt did not kill all the cluster workers that it generated')
      done()
    }
  })

  it('should change the app to put it into dev mode and run on 2 cores ("-dc 2")', function (done) {
    // int vars to hold how many times a server was started and how many times a thread was killed
    let serverStartInt = 0
    let devModeBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    const testApp = fork(path.join(appDir, 'app.js'), ['-dc', '2'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output to kill the app when the amount of server instances equal to the amount of cores used and keep track of the amount of threads killed
    testApp.stdout.on('data', (data) => {
      if (data.includes('development mode')) {
        devModeBool = true
      }
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === 2) {
          testApp.send('stop')
        }
      }
      if (data.includes('Roosevelt Express successfully closed all connections')) {
        exit()
      }
    })

    // on exit, check how many instances of the app server were made, synonymous with how many cores have been used
    function exit () {
      assert.strictEqual(devModeBool, true, 'Roosevelt did not start in dev mode')
      assert.strictEqual(serverStartInt, 2, 'Roosevelt did not kill all of the cluster workers that it generated')
      done()
    }
  })

  it('should use the max amount of cpu cores if the user passes in the command line argument "-c max"', function (done) {
    // int vars to hold how many times a server was started, how many cpu cores this enviroment has and how many times a process was killed
    let serverStartInt = 0
    const maxCores = os.cpus().length

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started " + process.pid)}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', 'max'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check output logs to kill the app when the server instances reach the max and keep track of all the thread that are killed
    testApp.stdout.on('data', (data) => {
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === maxCores) {
          testApp.send('stop')
        }
      }
      if (data.includes('Roosevelt Express successfully closed all connections')) {
        exit()
      }
    })

    // on exit, check if the app had killed the cluster that the app had created
    function exit () {
      assert.strictEqual(serverStartInt, maxCores, 'Roosevelt did not kill all the cluster workers that it generated')
      done()
    }
  })

  it('should default to one core if the number of cores the user asked is more than what the enviroment has', function (done) {
    // reset sOptions
    sOptions = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

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
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', `${tooManyCores}`], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      testApp.send('stop')
    })

    // on exit, see if the app reports it will use one core and that it only started one instance of the app
    testApp.on('exit', () => {
      assert.strictEqual(defaultCoresLogBool, true, 'Roosevelt try to set the amount of cores to something that is not possible (too many)')
      assert.strictEqual(serverStartInt, 1, 'Roosevelt started more or less than 1 server for the app')
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
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', `0`], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      testApp.send('stop')
    })

    // on exit, see if the app reports it will use one core and that it only started one instance of the app
    testApp.on('exit', () => {
      assert.strictEqual(defaultCoresLogBool, true, 'Roosevelt try to set the amount of cores to something that is not possible (too many)')
      assert.strictEqual(serverStartInt, 1, 'Roosevelt started more or less than 1 server for the app')
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
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true,
      localhostOnly: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `something`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    let server = http.createServer(function (req, res) {
      res.statusCode = 200
      res.end()
    }).listen(43711, 'localhost')

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })
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

  it('should report that the node_modules directory is missing some packages or that some are out of date', function (done) {
    // bool var to hold that whether or not a specific warning was outputted
    let missingOrOODPackageBool = false

    // command for npm
    let npmName
    if (os.platform() === 'win32') {
      npmName = 'npm.cmd'
    } else {
      npmName = 'npm'
    }

    // set up the node_modules and the package.json file
    fse.mkdirSync(appDir)
    let packageJSONSource = {
      dependencies: {
        colors: '~1.2.0',
        express: '~4.16.2'
      }
    }

    packageJSONSource = JSON.stringify(packageJSONSource)
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)
    spawnSync(npmName, ['install', 'express@3.0.0'], { cwd: appDir })
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, check if any display the missing or out of date warning log
    testApp.stderr.on('data', (data) => {
      if (data.includes('Dependencies are out of date! You may need to run npm i')) {
        missingOrOODPackageBool = true
      }
    })

    // when the app finishes init, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app exit, check to see if the warning log was made
    testApp.on('exit', () => {
      assert.strictEqual(missingOrOODPackageBool, true, 'Roosevelt did not report that there are some missing or out of date packages in the app Directory')
      done()
    })
  })

  it('should not report that the node_modules directory is missing some packages or that some are out of date if checkDependencies is false', function (done) {
    // bool var to hold that whether or not a specific warning was outputted
    let missingOrOODPackageBool = false

    // command for npm
    let npmName
    if (os.platform() === 'win32') {
      npmName = 'npm.cmd'
    } else {
      npmName = 'npm'
    }

    // set up the node_modules and the package.json file
    fse.mkdirSync(appDir)
    let packageJSONSource = {
      dependencies: {
        colors: '~1.2.0',
        express: '~4.16.2'
      }
    }

    packageJSONSource = JSON.stringify(packageJSONSource)
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)
    spawnSync(npmName, ['install', 'express@3.0.0'], { cwd: appDir })
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      checkDependencies: false
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, check if any display the missing or out of date warning log
    testApp.stderr.on('data', (data) => {
      if (data.includes('Dependencies are out of date! You may need to run npm i')) {
        missingOrOODPackageBool = true
      }
    })

    // when the app finishes init, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app exit, check to see if the warning log was made
    testApp.on('exit', () => {
      assert.strictEqual(missingOrOODPackageBool, false, 'Roosevelt did report that there are some missing or out of date packages in the app Directory even though checkDependencies is false')
      done()
    })
  })

  it('should be able to close an active connection when the app is closed', function (done) {
    // bool var to hold whether or not the request had finished
    let requestFinishedBool = false

    // copy the mvc folder to the test App
    let pathToMVC = path.join(__dirname, '/../util/mvc')
    let pathtoapp = path.join(appDir, '/mvc')
    fse.copySync(pathToMVC, pathtoapp)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, sOptions)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      appDir: appDir,
      generateFolderStructure: true,
      https: {
        enable: true,
        httpsPort: 43203,
        httpsOnly: true
      }
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
