/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Reload Frontend Tests', function () {
  const appDir = path.join(__dirname, '../app/reloadFrontendTest')

  // options to pass into test app generator
  let options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc directory into the test app directory for each test
    fse.copySync(path.join(__dirname, '../util/mvc'), path.join(appDir, 'mvc'))
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

  it('should start Reload HTTP server in development mode', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stdout.on('data', (data) => {
      if (data.includes('Reload HTTP server is listening on port:')) {
        testApp.send('stop')
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should start Reload HTTPS server in development mode', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      https: {
        enable: true,
        port: 43711,
        force: true,
        authInfoPath: {
          p12: {
            p12Path: 'test/util/certs/test.p12',
            passphrase: 'testpass'
          },
          authCertAndKey: {
            cert: 'test/util/certs/test.req.crt',
            key: 'test/util/certs/test.req.key'
          }
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stdout.on('data', (data) => {
      if (data.includes('Reload HTTPS server is listening on port:')) {
        testApp.send('stop')
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not start Reload HTTP server in production mode', function (done) {
    let reloadFound = false
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stdout.on('data', (data) => {
      if (data.includes('Reload HTTP server is listening on port:')) {
        reloadFound = true
      }
    })

    // when the app finishes initiailization, kill it
    testApp.on('message', (msg) => {
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      assert.strictEqual(reloadFound, false, 'Reload started in production mode')
      done()
    })
  })

  it('should not start Reload HTTP server in development mode if reload is disabled', function (done) {
    let reloadFound = false
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      frontendReload: {
        enabled: false,
        port: 9857,
        verbose: false
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stdout.on('data', (data) => {
      if (data.includes('Reload HTTP server is listening on port:')) {
        reloadFound = true
      }
    })

    // when the app finishes initiailization, kill it
    testApp.on('message', (msg) => {
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      assert.strictEqual(reloadFound, false, 'Reload started in development mode even when disabled')
      done()
    })
  })

  it('should fail HTTP reload initialization if provided an invalid port', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      frontendReload: {
        enabled: true,
        port: 'invalid',
        verbose: false
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stderr.on('data', (data) => {
      if (data.includes('Reload was unable to initialize')) {
        testApp.send('stop')
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should fail HTTPS reload initialization if provided an invalid port', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      https: {
        enable: true,
        port: 43711,
        force: true
      },
      frontendReload: {
        enabled: true,
        port: 'invalid',
        verbose: false
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stderr.on('data', (data) => {
      if (data.includes('Reload was unable to initialize')) {
        testApp.send('stop')
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not start Reload HTTPS server in development mode without a p12 or certAndKey', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      https: {
        enable: true,
        port: 43711,
        force: true
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // process.stdout
    testApp.stderr.on('data', (data) => {
      if (data.includes('Reload was unable to start')) {
        testApp.send('stop')
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to inject reload script tag to view', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // Should now have script tag containing reload.js
          assert.strictEqual(res.text.includes(`<script src='/reload/reload.js'></script>`), true)

          testApp.send('stop')
        })
    })

    // exit app
    testApp.on('exit', () => {
      done()
    })
  })
})
