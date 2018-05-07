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
      },
      viewEngine: [
        'html: teddy'
      ]
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      // array to hold all the promises
      let promises = []
      // loop through and shoot a group of promises that will try to go to the server and link
      for (let x = 0; x < 150; x++) {
        promises.push(new Promise((resolve, reject) => {
          request(`http://localhost:${params.port}`)
            .get('/teddyTest')
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
      },
      viewEngine: [
        'html: teddy'
      ]
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    // on the message that tells us that the server has started, test the path that will run into a server error
    testApp.on('message', (params) => {
      // array to hold all the promises
      let promises = []
      // loop through and shoot a group of promises that will try to go to the server and link
      for (let x = 0; x < 150; x++) {
        promises.push(new Promise((resolve, reject) => {
          request(`http://localhost:${params.port}`)
            .get('/teddyTest')
            .expect(200, (err, res) => {
              if (err && res !== undefined) {
                const test1 = res.text.includes('503 Service Unavailable')
                const test2 = res.text.includes('The requested URL /teddyTest is temporarily unavailable at this time')
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

  it('should be able to handle multiple viewEngines and set a name with a value and not change it', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      viewEngine: [
        'html: teddy',
        'jcs: ../test/util/jcsTemplate'
      ],
      onServerStart: `(app) => {process.send(app.get("view engine"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (viewEngine) => {
      assert.equal(viewEngine, 'html', 'The view Engine has been set to something else other than the first element')
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to use templating languages that are just functions and that do not have __express function', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      viewEngine: [
        'jcs: ../test/util/jcsTemplate'
      ],
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/jcsTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          assert.equal(res.text.includes('jcs Test'), true)
          assert.equal(res.text.includes('jcsHeader'), true)
          assert.equal(res.text.includes('jcsParagraph'), true)
          testApp.kill('SIGINT')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should throw an Error if the ViewEngine param contains strings that, if split with :, has a length of 2', function (done) {
    // bool var to hold whether or not the error of the viewEngine param being formatted incorrectly was thrown
    let viewEngineFormattedIncorrectlyBool = false

    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      viewEngine: [
        'html: teddy: blah'
      ],
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // look at the error log and see if the error shows up
    testApp.stderr.on('data', (data) => {
      if (data.includes('fatal error: viewEngine param must be formatted')) {
        viewEngineFormattedIncorrectlyBool = true
      }
    })

    // when the app is starting, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to end, check to see if the error log was outputted
    testApp.on('exit', () => {
      assert.equal(viewEngineFormattedIncorrectlyBool, true, 'Roosevelt did not throw an error when the way viewEngine was formatted incorrectly')
      done()
    })
  })

  it('should throw an Error if the module passed into viewEngine is nonExistent', function (done) {
    // bool var to hold whether or not the error of the viewEngine needing to be configured properlt
    let viewEngineConfiguredIncorrectlyBool = false

    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      viewEngine: [
        'html: teddyza'
      ],
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // look at the error log and see if the error shows up
    testApp.stderr.on('data', (data) => {
      if (data.includes('Failed to register viewEngine')) {
        viewEngineConfiguredIncorrectlyBool = true
      }
    })

    // when the app is starting, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to end, check to see if the error log was outputted
    testApp.on('exit', () => {
      assert.equal(viewEngineConfiguredIncorrectlyBool, true, 'Roosevelt did not throw an error when the ViewEngine contains a node module that does not exists')
      done()
    })
  })

  it('should be able to set the viewEngine if it was just a string', function (done) {
    // generate the app.js
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      viewEngine: 'html: teddy',
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app finishes its initialization and is about to start, send a request to the teddy page
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
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should complete the request even though the server was closed in the middle of it and respond 503 to any other request made afterwards', function (done) {
    // bool var to hold whether or not the correct logs were outputted
    let shuttingDownLogBool = false
    let successfulShutdownBool = false
    // var to hold port number
    let port = 0

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console.logs, see if the correct ones are being outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express received kill signal, attempting to shut down gracefully.')) {
        shuttingDownLogBool = true
      }
      if (data.includes('Roosevelt Express successfully closed all connections and shut down gracefully.')) {
        successfulShutdownBool = true
      }
    })

    // when the app finishes, save the app and send a request to the page that has a long timeout
    testApp.on('message', (params) => {
      if (params.port) {
        port = params.port
        request(`http://localhost:${params.port}`)
          .get('/longWait')
          .expect(200, (err, res) => {
            // it should still respond with longWait done
            if (err) {
              assert.fail(err)
            } else {
              assert.equal(res.text, 'longWait done', 'Roosevelt did not finish a response that was made before it was shut down')
            }
          })
      } else {
        // the controller of /longWait sends back a message, on that msg, kill the app and try to grab a basic page
        testApp.kill('SIGINT')
        request(`http://localhost:${port}`)
          .get('/')
          // we should get back a 503 from the request
          .expect(503, (err, res) => {
            if (err) {
              assert.fail(err)
            } else {
              let test = res.text.includes('503 Service Unavailable')
              assert.equal(test, true, 'Roosevelt did not respond back with a 503 page when a page was requested as it was shutting down')
            }
          })
      }
    })

    // on exit, see that the right logs were outputted
    testApp.on('exit', () => {
      assert.equal(shuttingDownLogBool, true, 'Roosevelt did not log that it is gracefully shutting down the server')
      assert.equal(successfulShutdownBool, true, 'Roosevelt did not log that it successfully closed all connections and that its shutting down')
      done()
    })
  })

  it('should force close all active connections if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', function (done) {
    // bool vars to hold whether or not the correct logs were outputted
    let forceCloseLogBool = false
    let shuttingDownLogBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      shutdownTimeout: 7000
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console logs, see that the app is shutting down
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express received kill signal, attempting to shut down gracefully.')) {
        shuttingDownLogBool = true
      }
    })

    // on error, see that not all connections are finishing and that its force killing them
    testApp.stderr.on('data', (data) => {
      if (data.includes('Roosevelt Express could not close all connections in time; forcefully shutting down')) {
        forceCloseLogBool = true
      }
    })

    // when the app finishes initialization, ask for longWait
    testApp.on('message', (params) => {
      if (params.port) {
        request(`http://localhost:${params.port}`)
          .get('/longWait')
          // since we are force closing this connection while its still active, it should not send back a response object or a status number
          .expect(200, (err, res) => {
            if (err) {
              let test = err.message.includes(`Cannot read property 'status' of undefined`)
              assert.equal(test, true, 'Error did not state that it can not get the status of undefined')
            }
            assert.equal(res, undefined, 'Roosevelt gave back a response object even though the connection for force closed')
          })
      } else {
        testApp.kill('SIGINT')
      }
    })

    // on exit, see if the correct logs were outputted
    testApp.on('exit', () => {
      assert.equal(forceCloseLogBool, true, 'Roosevelt did not log that it is force closing connections')
      assert.equal(shuttingDownLogBool, true, 'Roosevelt did not log that it is gracefully shutting down the server')
      done()
    })
  })

  it('should be able to start the app normally without spitting any controller errors even though there is a non-controller file in the controller folder', function (done) {
    // bool vars to hold whether or not specifc warnings or logs were made
    let appCompletedInitLogBool = false
    let controllerErrorLogBool = false

    // copy the ico file into the mvc controller directory
    fse.copyFileSync(path.join(__dirname, '../', 'util', 'faviconTest.ico'), path.join(appDir, 'mvc', 'controllers', 'faviconTest.ico'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on console logs, see if the app completed its initialization
    testApp.stdout.on('data', (data) => {
      if (data.includes('Roosevelt Express HTTP server listening on port 43711 (development mode)')) {
        appCompletedInitLogBool = true
      }
    })

    // on error logs, see if the app failed to load any controller files
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to load controller file')) {
        controllerErrorLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app exits, see if the initialization complete log happened and the controller error log did not
    testApp.on('exit', () => {
      assert.equal(appCompletedInitLogBool, true, 'Roosevelt did not complete its initalization, probably because of the non-controller file in the controller directory')
      assert.equal(controllerErrorLogBool, false, 'Roosevelt threw an error on a file in the controller directory that it should have passed over')
      done()
    })
  })
})
