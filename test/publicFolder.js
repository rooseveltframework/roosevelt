/* eslint-env mocha */

const assert = require('assert')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Public directory', () => {
  // path to the directory where the test app is located
  const appDir = path.join(__dirname, 'app/publicFolderTest')

  // options to pass into generateTestApp
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  // package.json source code
  const packageSource = '{ "version": "0.5.1", "rooseveltConfig": {}}'

  beforeEach(function (done) {
    // start by copying the premade mvc directory into the app directory
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  // clean up the test app directory after each test
  afterEach(async () => {
    await fs.remove(appDir)
  })

  it('should allow for a custom favicon and GET that favicon on request', done => {
    // copy the favicon to the images folder within the static folder
    fs.copySync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'statics/images/faviconTest.ico'))

    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      favicon: 'images/faviconTest.ico'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts,
    testApp.on('message', () => {
      // see if we can get an html page from the server
      request('http://localhost:43763')
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }

          // if a 200 status, grab the favicon from the server
          request('http://localhost:43763')
            .get('/favicon.ico')
            .expect(200, (err, res) => {
              if (err) {
                testApp.send('stop')
                assert.fail(err)
              }
              // convert buffer to base64
              const faviconData = res.body.toString('base64')
              // get the base64 buffer of the favicon that we should be using in util
              const data = fs.readFileSync(path.join(__dirname, './util/faviconTest.ico'))
              const encodedImageData = Buffer.from(data, 'binary').toString('base64')
              // check if both buffers are the same (they should be)
              const test = faviconData === encodedImageData
              assert.strictEqual(test, true)
              testApp.send('stop')
            })
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow for no favicon with a null paramter', done => {
    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      favicon: null
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, send a request to the server
    testApp.on('message', () => {
      request('http://localhost:43763')
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // if we can get the page, send a request to get the favicon
          request('http://localhost:43763')
            .get('/favicon.ico')
            .expect(404, (err, res) => {
              if (err) {
                assert.fail('able to get the favicon.ico, even when there isn\'t one')
                testApp.send('stop')
              } else {
                testApp.send('stop')
              }
            })
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to set favicon to a wrong or non-existent path and have no favicon show up', done => {
    // bool var to keep track of whether or not the app tells the user that the provided path leads to a non existent favicon
    let nonExistentWarningBool = false
    // generate the app.js file
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      favicon: 'images/nothingHere.ico'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error stream, check for an incorrect favicon log
    testApp.stderr.on('data', (data) => {
      if (data.includes('Please ensure the "favicon" param is configured correctly')) {
        nonExistentWarningBool = true
      }
    })

    // when the server starts, send a request to the server
    testApp.on('message', () => {
      request('http://localhost:43763')
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            testApp.send('stop')
            assert.fail(err)
          }
          // if we can get the page, send a request to get the favicon
          request('http://localhost:43763')
            .get('/favicon.ico')
            .expect(404, (err, res) => {
              if (err) {
                assert.fail('able to get the favicon.ico, even when there isn\'t one')
                testApp.send('stop')
              } else {
                testApp.send('stop')
              }
            })
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(nonExistentWarningBool, true, 'There was no warning saying that the favicon warning was set improperly')
      done()
    })
  })

  it('should set the name of folder inside of public to the version inside of package.json', done => {
    // write the package json file with the source code from above
    fs.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // generate the app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      versionedPublic: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check for the existence of the directory once the server is started up
    testApp.on('message', () => {
      assert(fs.existsSync(path.join(appDir, 'public/0.5.1')), 'Versioned public folder was not generated')
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
