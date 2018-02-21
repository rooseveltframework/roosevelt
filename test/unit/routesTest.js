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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/teddyTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
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
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and be able to send back a plain HTML file on request', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
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
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server on a differnt port and be able to send back a plain HTML file on request', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      port: 9000,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

     // on the message sent by the app completing the start method, send a http request for the plain html page to the server and see if it sends back a response
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
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
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and send back the default 404 error page if a request is sent for non-existent page', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      viewEngine: [
        'html: teddy'
      ],
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message sent by the app completing the start method, send a http request for the teddy page to the server and see if it sends back a response
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/randomURL')
      .expect(404, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // sample the text from the response
        const test1 = res.text.includes('404 Not Found')
        const test2 = res.text.includes('The requested URL /randomURL was not found on this server')
        // test to see if the samples have the expected text from the default 404 error page
        assert.equal(test1, true)
        assert.equal(test2, true)
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and display a custom 404 error page if the user is requesting a page that does not exists and the user had adjusted the params to accomadate their custom page', function (done) {
    // copy over the custom 404 controller over to the mvc folder
    fse.copyFileSync(path.join(__dirname, '../', 'util', '404test.js'), path.join(appDir, 'mvc', 'controllers', '404test.js'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      error404: '404test.js',
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that proves that the server has started, look up a random url and see if the custom 404 page is given back
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/randomURL')
      .expect(404, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // see if the page has these 3 unique lines of text in it
        let test1 = res.text.includes('404 custom test error page')
        let test2 = res.text.includes('The page you are looking for is not found')
        let test3 = res.text.includes('This is a test to see if we can make custom 404 controllers and pages')
        // test the includes (should be true)
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and display a custom 500 error page if an error has occured on the server and the user had changed the param to accomadate their custom page', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      error5xx: '500test.js',
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/serverError')
      .expect(500, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // see if the page has these 3 unique lines of text in it
        let test1 = res.text.includes('500 custom test error page')
        let test2 = res.text.includes('An error had occurred on the server')
        let test3 = res.text.includes('This is a test to see if we can make custom 500 controllers and pages')
        // test the includes (should be true)
        assert.equal(test1, true)
        assert.equal(test2, true)
        assert.equal(test3, true)
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and display the default 500 error page if an error has occured on the server', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
      .get('/serverError')
      .expect(500, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // see if the page has these 3 default lines of text in it
        const test1 = res.text.includes('500 Internal Server Error')
        const test2 = res.text.includes('The requested URL /serverError is temporarily unavailable at this time.')
        // test the includes (should be true)
        assert.equal(test1, true)
        assert.equal(test2, true)
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should start the server and display a custom 503 error if the server is unable to handle the requests quick enough and the user changed the param to accomadate their custom page', function (done) {
    // varible to hold if the app was able to return all test with 200
    let allRequest200Bool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      error503: '503test.js',
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      toobusy: {
        maxLagPerRequest: 10,
        lagCheckInterval: 16
      }
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      // array to hold all the promises
      let promises = []
      // loop through and shoot a group of promises that will try to go to the server and link
      for (let x = 0; x < 10; x++) {
        promises.push(new Promise((resolve, reject) => {
          request(`http://localhost:${params.port}`)
          .get('/HTMLTest')
          .expect(200, (err, res) => {
            if (err && res !== undefined) {
              const test1 = res.text.includes('503 custom test error page')
              const test2 = res.text.includes('The server is either too busy or is under maintence, please try again later')
              const test3 = res.text.includes('This is a test to see if we can make custom 503 controllers and pages')
              // check to make sure that all specific pharses are there
              assert.equal(test1, true)
              assert.equal(test2, true)
              assert.equal(test3, true)
              reject(Error('one of the test returns a status of 503 and a page with the correct content'))
            } else {
              resolve()
            }
          })
        }))
      }

      Promise.all(promises).then(() => {
        // if everything is fine, then the test had failed
        allRequest200Bool = true
        testApp.kill('SIGINT')
      }).catch(() => {
        // if we had one rejection, it means that we had a response that gave back the custom 503 page
        testApp.kill('SIGINT')
      })
    })

    testApp.on('exit', () => {
      if (allRequest200Bool) {
        assert.fail('All the request to the server have respond with a 200, meaning either toobusy and/or its setup has an error, or the computer is too good')
      }
      done()
    })
  })

  it('should start the server and display the default 503 error page if the server is unable to handle the requests quick enough', function (done) {
    // varible to hold if the app was able to return all test with 200
    let allRequest200Bool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      toobusy: {
        maxLagPerRequest: 10,
        lagCheckInterval: 16
      }
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      // array to hold all the promises
      let promises = []
      // loop through and shoot a group of promises that will try to go to the server and link
      for (let x = 0; x < 10; x++) {
        promises.push(new Promise((resolve, reject) => {
          request(`http://localhost:${params.port}`)
          .get('/HTMLTest')
          .expect(200, (err, res) => {
            if (err && res !== undefined) {
              const test1 = res.text.includes('503 Service Unavailable')
              const test2 = res.text.includes('The requested URL /HTMLTest is temporarily unavailable at this time')
              // check to make sure that all specific pharses are there
              assert.equal(test1, true)
              assert.equal(test2, true)
              reject(Error('one of the test returns a status of 503 and a page with the correct content'))
            } else {
              resolve()
            }
          })
        }))
      }

      Promise.all(promises).then(() => {
        // if everything is fine, then the test had failed
        allRequest200Bool = true
        testApp.kill('SIGINT')
      }).catch(() => {
        // if we had one rejection, it means that we had a response that gave back the custom 503 page
        testApp.kill('SIGINT')
      })
    })

    testApp.on('exit', () => {
      if (allRequest200Bool) {
        assert.fail('All the request to the server have respond with a 200, meaning either toobusy and/or its setup has an error, or the computer is too good')
      }
      done()
    })
  })
})
