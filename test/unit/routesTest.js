/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt routes Section Test', function () {
  const appDir = path.join(__dirname, '../', 'app', 'routesTest')

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fse.copySync(path.join(__dirname, '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
    done()
  })

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should start the server and be able to send back the test Teddy page on request', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      viewEngine: [
        'html: teddy'
      ],
      onServerStart: true
    }, 'startServer')

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/teddyTest')
      .expect(200, (err) => {
        if (err) {
          assert.fail(err)
        }
        testApp.kill()
        done()
      })
    })
  })

  it('should start the server and be able to send back a plain HTML file on request', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true
    }, 'startServer')

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err) => {
        if (err) {
          assert.fail(err)
        }
        testApp.kill()
        done()
      })
    })
  })

  it('should start the server on a differnt port and be able to send back a plain HTML file on request', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      port: 3000,
      generateFolderStructure: true,
      onServerStart: true
    }, 'startServer')

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:3000')
      .get('/HTMLTest')
      .expect(200, (err) => {
        if (err) {
          assert.fail(err)
        }
        testApp.kill()
        done()
      })
    })
  })

  it('should start the server and send back a 404 status if a request is sent for non-existent page', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      viewEngine: [
        'html: teddy'
      ],
      onServerStart: true
    }, 'startServer')

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/randomURL')
      .expect(404, (err) => {
        if (err) {
          assert.fail(err)
        }
        testApp.kill()
        done()
      })
    })
  })
})
