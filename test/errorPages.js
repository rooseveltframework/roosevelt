/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('error pages', function () {
  const appDir = path.join(__dirname, 'app/errorPages')

  // options to pass into test app generator
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc directory into the test app directory for each test
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  afterEach(function (done) {
    // clean up the test app directory after each test
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should render the default 404 page if there is a request for an invalid route', function (done) {
    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      viewEngine: [
        'html: teddy'
      ],
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request an invalid route
    testApp.on('message', () => {
      request('http://localhost:43711')
        .get('/randomURL')
        .expect(404, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // data included on the 404 page
          const test1 = res.text.includes('404 Not Found')
          const test2 = res.text.includes('The requested URL /randomURL was not found on this server')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          testApp.send('stop')
        })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should render a custom 404 page if there is a request for an invalid route and the 404 parameter is set.', function (done) {
    // copy the custom 404 controller into to the mvc folder
    fs.copyFileSync(path.join(__dirname, './util/404test.js'), path.join(appDir, 'mvc/controllers/404test.js'))

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      errorPages: {
        notFound: '404test.js'
      },
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request an invalid route
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/randomURL')
        .expect(404, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // data included on the custom 404 page
          const test1 = res.text.includes('404 custom test error page')
          const test2 = res.text.includes('The page you are looking for is not found')
          const test3 = res.text.includes('This is a test to see if we can make custom 404 controllers and pages')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, true)
          testApp.send('stop')
        })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should render a custom 500 page if there is a request for a route that will respond with a server error and the 500 parameter is set', function (done) {
    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      errorPages: {
        internalServerError: '500test.js'
      },
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request the server error route
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/serverError')
        .expect(500, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // data included on the custom 500 page
          const test1 = res.text.includes('500 custom test error page')
          const test2 = res.text.includes('An error had occurred on the server')
          const test3 = res.text.includes('This is a test to see if we can make custom 500 controllers and pages')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, true)
          testApp.send('stop')
        })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should render the default 500 error page if an error has occured on the server', function (done) {
    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request the server error route
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/serverError')
        .expect(500, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // data included on the default 500 page
          const test1 = res.text.includes('500 Internal Server Error')
          const test2 = res.text.includes('The requested URL /serverError is temporarily unavailable at this time.')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          testApp.send('stop')
        })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should complete the request even though the server was closed in the middle of it and respond 503 to any other request made afterwards', function (done) {
    let shuttingDownLogBool = false
    let successfulShutdownBool = false
    let port = 0

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console.logs, check for correct output
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
              assert.strictEqual(res.text, 'longWait done', 'Roosevelt did not finish a response that was made before it was shut down')
            }
          })
      } else {
        // the controller of /longWait sends back a message, on that msg, kill the app and try to grab a basic page
        testApp.send('stop')
        request(`http://localhost:${port}`)
          .get('/')
          // we should get back a 503 from the request
          .expect(503, (err, res) => {
            if (err) {
              assert.fail(err)
            } else {
              const test = res.text.includes('503 Service Unavailable')
              assert.strictEqual(test, true, 'Roosevelt did not respond back with a 503 page when a page was requested as it was shutting down')
            }
          })
      }
    })

    // when the child process exits, test the assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(shuttingDownLogBool, true, 'Roosevelt did not log that it is gracefully shutting down the server')
      assert.strictEqual(successfulShutdownBool, true, 'Roosevelt did not log that it successfully closed all connections and that its shutting down')
      done()
    })
  })

  it('should force close all active connections and exit the process if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', function (done) {
    let forceCloseLogBool = false
    let shuttingDownLogBool = false

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      shutdownTimeout: 7000
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

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
            if (!err) {
              assert.fail('The server responded without error.')
            }
            assert.strictEqual(res, undefined, 'Roosevelt gave back a response object even though the connection for force closed')
          })
      } else {
        testApp.send('stop')
      }
    })

    // when the child process exits, test the assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(forceCloseLogBool, true, 'Roosevelt did not log that it is force closing connections')
      assert.strictEqual(shuttingDownLogBool, true, 'Roosevelt did not log that it is gracefully shutting down the server')
      done()
    })
  })

  it('should force close all active connections and close the HTTP & HTTPS server if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', function (done) {
    // add test app features to use server close and then exit process
    options.close = true
    options.exitProcess = true
    options.serverType = 'httpsServer'

    // bool vars to hold whether or not the correct logs were outputted
    let forceCloseLogBool = false
    let shuttingDownLogBool = false

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      expressSession: false,
      csrfProtection: false,
      https: {
        enable: true,
        port: 43203,
        autoCert: false
      },
      onServerStart: '(app) => {process.send(app.get("params"))}',
      shutdownTimeout: 7000
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

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
            if (!err) {
              assert.fail('The server responded without error.')
            }
            assert.strictEqual(res, undefined, 'Roosevelt gave back a response object even though the connection for force closed')
          })
      } else {
        testApp.send('stop')
      }
    })

    // when the child process exits, test the assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(forceCloseLogBool, true, 'Roosevelt did not log that it is force closing connections')
      assert.strictEqual(shuttingDownLogBool, true, 'Roosevelt did not log that it is gracefully shutting down the server')
      delete options.close
      delete options.exitProcess
      delete options.serverType
      done()
    })
  })

  it('should be able to start the app normally without any controller errors, even though there is a non-controller file in the controller folder', function (done) {
    let appCompletedInitLogBool = false
    let controllerErrorLogBool = false

    // copy the ico file into the controller directory
    fs.copyFileSync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'mvc/controllers/faviconTest.ico'))

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      expressSession: false,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      testApp.send('stop')
    })

    // when the child process exits, test the assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(appCompletedInitLogBool, true, 'Roosevelt did not complete its initalization, probably because of the non-controller file in the controller directory')
      assert.strictEqual(controllerErrorLogBool, false, 'Roosevelt threw an error on a file in the controller directory that it should have passed over')
      done()
    })
  })
})
