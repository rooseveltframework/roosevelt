/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('HTML Tidy Test', function () {
  // directory for the test app
  const appDir = path.join(__dirname, '../app/htmlTidyTest')

  // options that would be put into generateTestApp params
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc dir from util to the test app
    fse.copySync(path.join(appDir, '../../util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

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

  it('should give back a validation error page if htmltidy middleware is running and the app is trying to send back an html page with errors', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      htmlTidy: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', (params) => {
      // request the bad html page
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(500, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // test the text returned to see if it has the validation error page title in it
          let test1 = res.text.includes('HTML did not pass validation')
          let test2 = res.text.includes('<h2>Errors:</h2>')
          let test3 = res.headers['htmltidy']
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, 'true')

          // kill the app
          testApp.send('stop')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should load a page normally if htmltidy is enabled and the page being loaded has no errors', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlTidy: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, test to see if valid html will not cause an error
    testApp.on('message', (params) => {
      // get the plain html page
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // test if the elements added into the plain HTML show in the response
          let test1 = res.text.includes('TitleX')
          let test2 = res.text.includes('headingX')
          let test3 = res.text.includes('sentence1X')
          let test4 = res.text.includes('sentence2X')
          let test5 = res.headers['htmltidy']
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, true)
          assert.strictEqual(test4, true)
          assert.strictEqual(test5, 'true')
          testApp.send('stop')
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should disable tidy if app is running in production mode', function (done) {
    // Boolean determining whether HTML Tidy is disabled
    let tidyDisabled = false

    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlTidy: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, test to see if valid html will not cause an error
    testApp.stderr.on('data', (data) => {
      // get the plain html pag
      if (data.includes('HTML tidy disabled. Continuing without HTML validation...')) {
        tidyDisabled = true
      }
    })

    // when the app finishes its initalization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      assert.strictEqual(tidyDisabled, true, 'Roosevelt did not start with HTML Tidy disabled')
      done()
    })
  })

  it('should not execute tidy for a page not found', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlTidy: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', (params) => {
      // get the plain html page
      request(`http://localhost:${params.port}`)
        .get('/tidy404')
        .expect(404, (err, res) => {
          if (err) {
            assert.fail(err)
          }

          // test if the elements added into the plain HTML show in the response
          let test1 = res.text.includes('Not Found')
          let test2 = res.headers['htmltidy']
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, 'false')
          testApp.send('stop')
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
