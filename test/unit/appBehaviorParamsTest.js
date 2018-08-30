/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Roosevelt Multipart/Formidable Section Test', function () {
  const appDir = path.join(__dirname, '../app/multipartFormidableTest')

  beforeEach(function (done) {
    // copy the mvc directory into the test app directory for each test
    fse.copySync(path.join(__dirname, '../util/mvc'), path.join(appDir, 'mvc'))
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

  // options to pass into test app generator
  let options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  it('should be able to post files to the server, move them, and read their content', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, send a file to the server
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartTest')
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .on('error', (err) => {
          assert.fail(err)
          testApp.send('stop')
        })
        .then((res) => {
          // test to see if the file was uploaded
          assert(res.body.lengthTest, true)

          // test to see if the file exists (testing to see if it was moved from the temporary spot)
          let test1 = fse.existsSync(path.join(appDir, 'test1.txt'))
          assert(test1, true)

          // test to see if the data in the neew file is correct
          let file1Contents = fse.readFileSync(path.join(appDir, 'test1.txt')).toString('utf8')
          let test2 = file1Contents === `This is the first test document for the multipart Test. Hope this goes well`
          assert.strictEqual(test2, true)
          testApp.send('stop')
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to set the parameters for formidable to set an upload directory', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
        uploadDir: appDir
      }
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app has started send a post request to formidable
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartUploadDir')
        .field('uploadDir', appDir)
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .on('error', (err) => {
          assert.fail(err)
          testApp.send('stop')
        })
        .then((res) => {
          // test the set parameter to see where the file was uploaded on the server
          assert.strictEqual(res.body.existsTest, true)
          testApp.send('stop')
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to set bodyParserURLencodedParams and send too many parameters to body-parser.urlencoded', function (done) {
    let tooManyParamErrorBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      bodyParserUrlencodedParams: {
        extended: true,
        parameterLimit: 1
      }
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, send a request with a url that has more params then what is allowed
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/paramLimit')
        .send('test1=blah')
        .send('test2=slah')
        .expect(200, (err, res) => {
          if (err) {
            if (res.body.type === 'parameters.too.many') {
              tooManyParamErrorBool = true
            }
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(tooManyParamErrorBool, true, 'parameterLimit has not influenced body parser urlencoded in the way it is suppose to')
      done()
    })
  })

  it('should be able to send params to body-parser.json through bodyParserJsonParams and see a change in behavior', function (done) {
    let entityTooLargeBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      bodyParserJsonParams: {
        limit: 10
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on server start, see if we can get an error of entity too large by sending a bunch of json data to the post
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/JSONLimit')
        .send({ test1: 'adam' })
        .send({ test2: 'bob' })
        .send({ test3: 'calvin' })
        .send({ test4: 'daniel' })
        .send({ test5: 'evan' })
        .expect(200, (err, res) => {
          if (err) {
            if (res.body.type === 'entity.too.large') {
              entityTooLargeBool = true
            }
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(entityTooLargeBool, true, 'limit has not influenced body-parser.json in the way that it should')
      done()
    })
  })

  it('should throw an error if something wrong occurs when formidable tries to parse a file (size of fields exceed max)', function (done) {
    let multipartParseErrorBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
        multiples: false,
        maxFieldsSize: 2
      }
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error stream to see if the correct error is in the output
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to parse multipart form')) {
        multipartParseErrorBool = true
      }
    })

    // when the app starts, send a post request to the controller
    testApp.on('message', (params) => {
      // send multiple fields to exceed the max field size
      request(`http://localhost:${params.port}`)
        .post('/multipartTest')
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .field('testing1', 6)
        .field('testing2', 4)
        .field('testing3', 1)
        .on('error', () => {
          // roosevelt should throw an error
          testApp.send('stop')
        }).then((res) => {
          if (res.status === 200) {
            // if we get a 200, an error was not thrown and something is wrong
            assert.fail('Roosevelt somehow was able to parse this form even though the setup of the test should make it fail')
            testApp.send('stop')
          }
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(multipartParseErrorBool, true, 'Roosevelt did not throw an error when an error was suppose to occur with formidable trying to parse the form')
      done()
    })
  })

  it('should not throw an error if the user deletes temps files in the controller', function (done) {
    let removeTmpFilesErrorBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app starts, send a request with a file and delete the temp file
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartDelete')
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // see if the controller deleted the file
          for (let x = 0; x < res.body.existenceTest.length; x++) {
            if (res.body.existenceTest[x] === true) {
              assert.fail('Something was not deleted')
            }
          }
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(removeTmpFilesErrorBool, false, 'Roosevelt attempted to delete the temp file when its not suppose to (its gone before cleanup)')
      done()
    })
  })

  it('should not try to delete a file or throw an error if the file path was not a string', function (done) {
    let removeTmpFilesErrorBool = false
    let originalPath = ''

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app starts, send a request to the change path controller
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartChangePath')
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          originalPath = res.body.originalPath
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      let test = fse.existsSync(originalPath)
      assert.strictEqual(test, true, 'The temp file was deleted even though it was not suppose to be deleted')
      assert.strictEqual(removeTmpFilesErrorBool, false, 'Roosevelt attempted to delete the temp file when its not suppose to (its path was changed to a number)')
      done()
    })
  })

  it('should throw an error if something goes wrong with fs.unlink (the temp path leads to a folder)', function (done) {
    let removeTmpFilesErrorBool = false
    let originalPath = ''

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app starts, send a post to the route that will replace the file with a dir and wait for a response
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartDirSwitch')
        .attach('test1', path.join(__dirname, '../util/multipartText1.txt'))
        .expect(200)
        .end((err, res) => {
          if (err) {
            assert.fail(res.err)
            testApp.send('stop')
          }
          originalPath = res.body.path
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      let test = fse.existsSync(originalPath)
      assert.strictEqual(test, true, 'Roosevelt somehow deleted a directory with fs.unlink')
      assert.strictEqual(removeTmpFilesErrorBool, true, 'Roosevelt did not throw an error while trying to fs.unlink a directory')
      done()
    })
  })

  it('should default multipart to an object if the param passed in is not an object and it is not false', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts, check the params of the app that are sent back to check if multipart is an empty object
    testApp.on('message', (params) => {
      let test1 = typeof params.multipart
      let test2 = Object.keys(params.multipart)
      assert.strictEqual(test1, 'object', 'Roosevelt did not default multipart to an empty object if it was not an object and it is not false')
      assert.strictEqual(test2.length, 0, 'Roosevelt did not default multipart to an empty object if it was not an object and it is not false')
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
