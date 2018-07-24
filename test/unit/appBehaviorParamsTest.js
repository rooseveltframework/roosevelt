/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt multipart/formidable Section Test', function () {
  const appDir = path.join(__dirname, '../', 'app', 'multipartFormidableTest')

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

  // options to pass to the generateTestApp param
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true}

  it('should allow me to post multiple files to the server, move them, and read their content', function (done) {
    // generate the app.js
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // create a fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the server starts, send some files to the server
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartTest')
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .on('error', (err) => {
          assert.fail(err)
          testApp.send('stop')
        })
        .then((res) => {
          // test to see if the two files were uploaded
          assert(res.body.lengthTest, true)

          // test to see if the files exists (testing to see if they were moved from the temporary spot)
          let test1 = fse.existsSync(path.join(appDir, 'test1.txt'))
          assert(test1, true)

          // test to see if all the info on the newly copied files are correct
          let file1Contents = fse.readFileSync(path.join(appDir, 'test1.txt')).toString('utf8')
          let test2 = file1Contents === `This is the first test document for the multipart Test. Hope this goes well`
          assert.equal(test2, true)

          testApp.send('stop')
        })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow me to change the parameters sent to formidable from the multipart param', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
        uploadDir: appDir
      }
    }, options)

    // create a fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartUploadDir')
        .field('uploadDir', appDir)
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .on('error', (err) => {
          assert.fail(err)
          testApp.send('stop')
        })
        .then((res) => {
          // test to see that the changed parameter had changed where the file was uploaded to on the server
          assert.equal(res.body.existsTest, true)
          testApp.send('stop')
        })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to send params to body-parser.urlencoded through bodyParserURLencodedParams and see a change in its behavior', function (done) {
    // variable to hold whether or not the right error has been passed back
    let tooManyParamErrorBool = false

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      bodyParserUrlencodedParams: {
        extended: true,
        parameterLimit: 1
      }
    }, options)

    // create a fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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
    testApp.on('exit', () => {
      if (!tooManyParamErrorBool) {
        assert.fail('parameterLimit has not influenced body parser urlencoded in the way it is suppose to')
      }
      done()
    })
  })

  it('should be able to send params to body-parser.json through bodyParserJsonParams and see a change in behavior', function (done) {
    // variable to hold whether or not we had made an error by having a request size that's too big
    let entityTooLargeBool = false

    // generate the app.js
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      bodyParserJsonParams: {
        limit: 10
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on server start, see if we can get an error of entity too large by sending a bunch of json data to the post
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/JSONLimit')
        .send({test1: 'adam'})
        .send({test2: 'bob'})
        .send({test3: 'calvin'})
        .send({test4: 'daniel'})
        .send({test5: 'evan'})
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

    testApp.on('exit', () => {
      if (!entityTooLargeBool) {
        assert.fail('limit has not influenced body-parser.json in the way that it should')
      }
      done()
    })
  })

  it('should throw an error if something wrong occurs when formidable tries to parse file (size of fields exceed max)', function (done) {
    // bool var to hold whether or not a specific error message comes out or not
    let multipartParseErrorBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
        multiples: false,
        maxFieldsSize: 2
      }
    }, options)

    // create a fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the error logs to see if the specific error comes out
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to parse multipart form')) {
        multipartParseErrorBool = true
      }
    })
    // when the app starts, make a call to the controller and pass more
    testApp.on('message', (params) => {
      // send multiple fields to exceed the max field size
      request(`http://localhost:${params.port}`)
        .post('/multipartTest')
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .field('testing1', 6)
        .field('testing2', 4)
        .field('testing3', 1)
        .on('error', () => {
          // roosevelt should throw an error, meaning the app passed the test
          testApp.send('stop')
        }).then((res) => {
          if (res.status === 200) {
            // if we get a 200, an error was not thrown and something is wrong
            assert.fail('Roosevelt somehow was able to parse this form even though the setup of the test should make it fail')
            testApp.send('stop')
          }
        })
    })
    // when the app is about to exit, see if the specific error log was given
    testApp.on('exit', () => {
      if (multipartParseErrorBool === false) {
        assert.fail('Roosevelt did not throw an error when an error was suppose to occur with formidable trying to parse the form')
      }
      done()
    })
  })

  it('should not throw an error if the user deletes temps files in the controller', function (done) {
    // bool var to hold whether or not a specific error was outputted
    let removeTmpFilesErrorBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app finishes its initialization and starts, send a request with some files and delete the temp files
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartDelete')
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // see if the controller deleted all the files
          for (let x = 0; x < res.body.existenceTest.length; x++) {
            if (res.body.existenceTest[x] === true) {
              assert.fail('Something was not deleted')
            }
          }
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })

    // when the app is about to exit, check that the 'couldn't delete tmp file' error didn't pop up
    testApp.on('exit', () => {
      assert.equal(removeTmpFilesErrorBool, false, 'Roosevelt attempted to delete the temp file when its not suppose to (its gone before cleanup)')
      done()
    })
  })

  it('should not try to delete a file or throw an error if the file path was not a string', function (done) {
    // bool var to hold whether or not a specific error was outputted
    let removeTmpFilesErrorBool = false

    // var to hold the original path of the temp file
    let oPath = ''

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app starts, send a request that would also give a file to the change path controller
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartChangePath')
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          oPath = res.body.originalPath
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })
    // when the app is about to exit, check to see if the app logged a certain error and test to see if the file is still there
    testApp.on('exit', () => {
      let test = fse.existsSync(oPath)
      assert.equal(test, true, 'The temp file was deleted even though it was not suppose to be deleted')
      assert.equal(removeTmpFilesErrorBool, false, 'Roosevelt attempted to delete the temp file when its not suppose to (its path was changed to a number)')
      done()
    })
  })

  it('should throw an error if something goes wrong with fs.unlink (the temp path leads to a folder)', function (done) {
    // bool var to hold whether or not a specific error was outputted
    let removeTmpFilesErrorBool = false

    // var to hold the origianl path of the temp file
    let Opath = ''

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: {
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on error logs, see if the specific error was logged
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to remove tmp file')) {
        removeTmpFilesErrorBool = true
      }
    })

    // when the app is finished initalization, send a post to the route that will replace the file with a dir and wait for response
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/multipartDirSwitch')
        .attach('test1', path.join(__dirname, '../', 'util', 'multipartText1.txt'))
        .expect(200)
        .end((err, res) => {
          if (err) {
            assert.fail(res.err)
            testApp.send('stop')
          }
          Opath = res.body.path
          setTimeout(() => { testApp.send('stop') }, 3000)
        })
    })

    // when the app is about to exit, check to see if the error was logged and that the path still has something associated with it
    testApp.on('exit', () => {
      let test = fse.existsSync(Opath)
      assert.equal(test, true, 'Roosevelt somehow deleted a directory with fs.unlink')
      assert.equal(removeTmpFilesErrorBool, true, 'Roosevelt did not throw an error while trying to fs.unlink a directory')
      done()
    })
  })

  it('should default multipart to an object if the param passed in is not an object and it is not false', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      multipart: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app finishes initialization, check the params of the app that are sent back to check if multipart is an empty object
    testApp.on('message', (params) => {
      let test1 = typeof params.multipart
      let test2 = Object.keys(params.multipart)
      assert.equal(test1, 'object', 'Roosevelt did not default multipart to an empty object if it was not an object and it is not false')
      assert.equal(test2.length, 0, 'Roosevelt did not default multipart to an empty object if it was not an object and it is not false')
      testApp.send('stop')
    })

    // on exit, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
