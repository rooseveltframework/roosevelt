/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('parameter Function Test Section', function () {
  // path to the app Directory
  const appDir = path.join(__dirname, '../', 'app', 'paramFunctionTest')

  // specify the options that will be passed to the generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fse.copySync(path.join(__dirname, '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
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

  it('should execute what is in onReqStart', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqStart: `(req, res, next) => {res.setHeader("onreqStartTest","true"); next()}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app starts and sends the message that "ServerStart", send a request and see if I get another message saying "ReqStart"
    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // check to see if a specific header was changed in the function onReqStart
          let test = res.get('onreqstarttest')
          if (test) {
            testApp.kill()
          } else {
            assert.fail('onReqStart was not called')
            testApp.kill()
          }
        })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should execute what is in onReqBeforeRoute', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqBeforeRoute: `(req, res, next) => {res.setHeader("onreqBeforeRoute","true"); next()}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // check to see if a specific header was changed in the function onReqBeforeRoute
          const test = res.get('onreqbeforeroute')
          if (test) {
            testApp.kill()
          } else {
            assert.fail('onReqBeforeRoute was not called')
            testApp.kill()
          }
        })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should execute what is in onReqAfterRoute', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqAfterRoute: `(req, res) => {process.send("onReqAfterRoute")}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (message) => {
      if (message.port) {
      // send a http request
        request(`http://localhost:${message.port}`)
          .get('/HTMLTest')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.kill('SIGINT')
            }
          })
          // see if we get a message that was sent from the onReqAfterRoute function
      } else if (message === 'onReqAfterRoute') {
        testApp.kill('SIGINT')
      }
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a public directory if one exists', function (done) {
    // bool var to see if the Roosevelt making the public dir is logged
    let publicDirCreationLogBool = false

    // create a public dir
    let publicFolderPath = path.join(appDir, 'public')
    fse.mkdirSync(publicFolderPath)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app logs, see if the specific log is outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public')}`)) {
        publicDirCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check if the specific log was outputted
    testApp.on('exit', () => {
      assert.equal(publicDirCreationLogBool, false, 'Roosevelt made a public Directory even though one exists alreadly')
      done()
    })
  })

  it('should not make a public directory if generateFolderStructure is false', function (done) {
    // bool var to see if the Roosevelt making the public dir is logged
    let publicDirCreationLogBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app logs, see if the specific log is outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public')}`)) {
        publicDirCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check if the specific log was outputted
    testApp.on('exit', () => {
      assert.equal(publicDirCreationLogBool, false, 'Roosevelt made a public Directory even though one exists alreadly')
      done()
    })
  })

  it('should not be using Multipart middleware if the param is set to false', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      multipart: false,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    // when the app is finished initialization, post a request with some files, should get back a 500
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/simpleMultipart')
        .attach('test1', path.join(appDir, '../', '../', 'util', 'text1.txt'))
        .attach('test2', path.join(appDir, '../', '../', 'util', 'text2.txt'))
        .expect(500, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          testApp.kill('SIGINT')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a folder that has the version number if one exists', function (done) {
    // bool var to hold whether or not the version public folder was made or not
    let versionPublicCreationLogBool = false
    // package.json source code
    let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`
    // create the package.json file
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)
    // create the version public folder
    let Dirpath1 = path.join(appDir, 'public')
    fse.mkdirSync(Dirpath1)
    let Dirpath2 = path.join(Dirpath1, '0.5.1')
    fse.mkdirSync(Dirpath2)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app console logs, see if the specific creation log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public', '0.5.1')}`)) {
        versionPublicCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check to see if the version public folder log was outputted
    testApp.on('exit', () => {
      assert.equal(versionPublicCreationLogBool, false, 'Roosevelt create a new version public folder even thought one existed')
      done()
    })
  })

  it('should not make a public version folder if generateFolderStructure is false', function (done) {
    // bool var to hold whether or not the version public folder was made or not
    let versionPublicCreationLogBool = false
    // package.json source code
    let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`
    // create the package.json file
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app console logs, see if the specific creation log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public', '0.5.1')}`)) {
        versionPublicCreationLogBool = true
      }
    })

    // when the app finishes initialization, see if a folder like that exists
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'public', '0.5.1'))
      assert.equal(test, false, 'Roosevelt made the version public folder even though generateFolderStrucutre is false')
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check if the specific log was made
    testApp.on('exit', () => {
      assert.equal(versionPublicCreationLogBool, false, 'Roosevelt made the version public folder even though generateFolderStrucutre is false')
      done()
    })
  })
})
