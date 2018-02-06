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

  // options to pass into generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

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
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/teddyTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // test that the four values that I put into the model and have in the view are being put into the page
        let test1 = res.text.includes('Teddy Test')
        let test2 = res.text.includes('Heading Test')
        let test3 = res.text.includes('This is the first sentence that I am grabbing from my teddy model')
        let test4 = res.text.includes('This is the second sentence that I am grabbing from my teddy model')
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        assert.equal(test4, true)
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
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // test that the four values that I put into the model and have in the view are being put into the page
        let test1 = res.text.includes('TitleX')
        let test2 = res.text.includes('headingX')
        let test3 = res.text.includes('sentence1X')
        let test4 = res.text.includes('sentence2X')
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        assert.equal(test4, true)
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
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:3000')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // test that the four values that I put into the model and have in the view are being put into the page
        let test1 = res.text.includes('TitleX')
        let test2 = res.text.includes('headingX')
        let test3 = res.text.includes('sentence1X')
        let test4 = res.text.includes('sentence2X')
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        assert.equal(test4, true)
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
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/randomURL')
      .expect(404, (err) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        testApp.kill()
        done()
      })
    })
  })

  it('should display the custom 404 page that I made if the user is requesting a page that does not exists', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      error404: path.join(__dirname, '../', 'util', 'mvc', 'controllers', '404.js'),
      onServerStart: true
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that proves that the server has started, look up a random url and see if the custom 404 page is given back
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/randomURL')
      .expect(404, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // see if the page has these 3 unique lines of text in it
        let test1 = res.text.includes('404 custom test error page')
        let test2 = res.text.includes('The page you are looking for is not found')
        let test3 = res.text.includes('This is a test to see if we can make custom 404 controllers and pages')
        // test the includes (should be true)
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        testApp.kill()
        done()
      })
    })
  })
})
