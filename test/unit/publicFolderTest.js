/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const klawSync = require('klaw-sync')
const request = require('supertest')

describe('Public folder section tests', function () {
  // path to the directory where the test app is located
  const appDir = path.join(__dirname, '../', 'app', 'publicFolderTest')
  // options to pass into generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  // package.json source code
  let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`

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

  it('should allow the user to set up a custom favicon and have the favicon that comes back from http request be the same as the one they load in', function (done) {
    // copy the favicon to the images folder within the static folder
    fse.copySync(path.join(__dirname, '../', 'util', 'faviconTest.ico'), path.join(appDir, 'statics', 'images', 'faviconTest.ico'))

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      favicon: 'images/faviconTest.ico'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })

    // when we get back the message that the server has started, send a request to the server
    testApp.on('message', () => {
      // see if we could get a html page from the server
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          console.log('here')
          assert.fail(err)
          testApp.kill('SIGINT')
        }

        // if it had worked, grab favicon from the server
        request('http://localhost:43711')
        .get('/favicon.ico')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // convert buffer to base64
          let faviconData = res.body.toString('base64')
          // get the base64 buffer of the favicon that we should be using in util
          let data = fse.readFileSync(path.join(__dirname, '../', 'util', 'faviconTest.ico'))
          let encodedImageData = Buffer.from(data, 'binary').toString('base64')
          // check if both buffers are the same(They should be)
          let test = faviconData === encodedImageData
          assert.equal(test, true)
          testApp.kill('SIGINT')
        })
      })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to set favicon to null and have no favicon show up', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      favicon: null
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })

    // when the server starts, send a request to the server
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // if we can get the page, send a request to get the favicon
        request('http://localhost:43711')
        .get('/favicon.ico')
        .expect(404, (err, res) => {
          if (err) {
            assert.fail(`able to get the favicon.ico, even when there isn't one`)
            testApp.kill('SIGINT')
          } else {
            testApp.kill('SIGINT')
          }
        })
      })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to set favicon to a wrong or non-existent path and have no favicon show up', function (done) {
    // bool var to keep track of whether or not the app tells the user that the provided path leads to a non existent favicon
    let nonExistentWarningBool = false
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      favicon: 'images/nothingHere.ico'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.stderr.on('data', (data) => {
      if (data.includes('Please ensure the "favicon" param is configured correctly')) {
        nonExistentWarningBool = true
      }
    })

    // when the server starts, send a request to the server
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        // if we can get the page, send a request to get the favicon
        request('http://localhost:43711')
        .get('/favicon.ico')
        .expect(404, (err, res) => {
          if (err) {
            assert.fail(`able to get the favicon.ico, even when there isn't one`)
            testApp.kill('SIGINT')
          } else {
            testApp.kill('SIGINT')
          }
        })
      })
    })

    testApp.on('exit', () => {
      if (nonExistentWarningBool === false) {
        assert.fail('There was no warning saying that the favicon warning was set improperly')
      }
      done()
    })
  })

  it('change the name of the public folder to what version number the app is on in the package.json file', function (done) {
    // write the package json file with the source code from above
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      versionedPublic: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the server message back on start up, look for if the public file was changed to the version number
    testApp.on('message', () => {
      // var to keep track of whether or not the public folder name was changed to the version number
      let publicNameChange = false
      // get the what is in the app folder
      const dirs = klawSync(path.join(appDir, 'public'), {nofile: true})
      dirs.forEach((dir) => {
        if (dir.path.includes('0.5.1')) {
          publicNameChange = true
        }
      })
      if (publicNameChange) {
        testApp.kill('SIGINT')
      } else {
        assert.fail('public folder name was not changed to version number')
        testApp.kill('SIGINT')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })
})
