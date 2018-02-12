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
      onReqStart: true,
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app starts and sends the message that "ServerStart", send a request and see if I get another message saying "ReqStart"
    testApp.on('message', () => {
      // send a http request
      request('http://localhost:43711')
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
      onReqBeforeRoute: true,
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // send a http request
      request('http://localhost:43711')
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
      onReqAfterRoute: true,
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (message) => {
      if (message === 'ServerStart') {
      // send a http request
        request('http://localhost:43711')
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
})
