/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const os = require('os')
// const request = require('supertest')

describe('Roosevelt roosevelt.js Section Tests', function () {
  const appDir = path.join(__dirname, '../', 'app', 'rooseveltTest')

  // options that would be put into generateTestApp params
  const options = {rooseveltPath: '../../../roosevelt', method: 'initServer'}
  const sOptions = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

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
    // create a empty app.js
    fse.ensureDirSync(appDir)
    let contents = fse.readFileSync(path.join(appDir, '../', '../', 'util', 'emptyParamApp.js')).toString('utf8')
    fse.writeFileSync(path.join(appDir, 'app.js'), contents)

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

    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to init Roosevelt without putting in a callback', function (done) {
    // bool var to see that a message was not send back by a call back and that folders exists
    let messageRecievedBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true
    }, options)

    // get rid of the callback in the initServer function
    let appContents = fse.readFileSync(path.join(appDir, 'app.js')).toString('utf8')
    appContents = appContents.replace(`process.send(app.expressApp.get('params'))`, ``)
    fse.writeFileSync(path.join(appDir, 'app.js'), appContents)

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

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true
    }, options)

    // get rid of the callback in the initServer function
    let appContents = fse.readFileSync(path.join(appDir, 'app.js')).toString('utf8')
    appContents = appContents.replace(`process.send(app.expressApp.get('params'))`, `'something'`)
    fse.writeFileSync(path.join(appDir, 'app.js'), appContents)

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
    // Int var to hold how many times a server was started
    let serverStartInt = 0

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
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', '3'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      if (data.includes(`server started`)) {
        serverStartInt++
        if (serverStartInt === 3) {
          testApp.kill('SIGINT')
          clearTimeout(timeout)
        }
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should make the app use the max amount of cpu cores if the user passes in the command line argument "-c max"', function (done) {
    // set a timeout in case the correct amount of instances are not made or something fails during initialization
    let timeout = setTimeout(function () {
      assert.fail('An error occurred during initiailization or the app did not start enough instances of the app based on the command line arguement')
      done()
    }, 5000)

    // Int var to hold how many times a server was started and how many cpu cores this enviroment has
    let serverStartInt = 0
    const maxCores = os.cpus().length

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {console.log("server started")}`
    }, sOptions)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '-c', 'max'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      if (data.includes('server started')) {
        serverStartInt++
        if (serverStartInt === maxCores) {
          testApp.kill('SIGINT')
          clearTimeout(timeout)
        }
      }
    })

    testApp.on('exit', () => {
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

    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTP server listening on port')) {
        serverStartInt++
      }
    })

    testApp.stderr.on('data', (data) => {
      if (data.includes('Defaulting to 1 core.')) {
        defaultCoresLogBool = true
      }
    })

    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      assert.equal(defaultCoresLogBool, true, 'Roosevelt try to set the amount of cores to something that is not possible (too many)')
      assert.equal(serverStartInt, 1, 'Roosevelt started more or less than 1 server for the app')
      done()
    })
  })
})
