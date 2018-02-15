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
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  it('should allow me to post multiple files to the server, move them, and read their content', function (done) {
    // generate the app.js
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
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
        testApp.kill('SIGINT')
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

        testApp.kill('SIGINT')
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
      onServerStart: true,
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
        testApp.kill('SIGINT')
      })
      .then((res) => {
        // test to see that the changed parameter had changed where the file was uploaded to on the server
        assert.equal(res.body.existsTest, true)
        testApp.kill('SIGINT')
      })
    })
    testApp.on('exit', () => {
      done()
    })
  })
})
