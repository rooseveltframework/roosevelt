/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt HTML Validator Test', function () {
  this.timeout(15000)

  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlValidatorTest')

  // options that would be put into generateTestApp params
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  beforeEach(function (done) {
    // copy the mvc dir from util to the test app
    fse.copySync(path.join(appDir, '../', '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
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

  it('should give back a validation error page if the htmlValidator is on and the app is trying to send back a html page with errors', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true
      },
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that we get back that the server has started, test the htmlValidator by trying to recieve a bad html page
    testApp.on('message', () => {
      // request the bad html page
      request('http://localhost:43711')
      .get('/Broken')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // test the text returned to see if it has the validation error page title in it
        let test1 = res.text.includes('HTML did not pass validation')
        let test2 = res.text.includes('<h2>Errors:</h2>')
        assert.equal(test1, true)
        assert.equal(test2, true)
        testApp.kill()
        done()
      })
    })
  })

  it('should load a page normally if the htmlValidator is enabled and the page being loaded has no errors', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true
      },
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // On getting the message back from the server, test to see that a good html will be past back even with the validator on
    testApp.on('message', () => {
      // get the plain html page
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }
        // test if the elements added into the plain HTML show in the response
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

  it('should allow warnigns to show up if "suppressWarnings" is false', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: false
      },
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/Broken')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }

        // test the text returned to see if it has the validation error page title in it
        let test1 = res.text.includes('HTML did not pass validation')
        let test2 = res.text.includes('<h2>Warnings:</h2>')
        assert.equal(test1, true)
        assert.equal(test2, true)
        testApp.kill()
        done()
      })
    })
  })

  it('should  not allow warnigns to show up if "suppressWarnings" is true', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true
      },
      onServerStart: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/Broken')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill()
          done()
        }

        // test the text returned to see if it has the validation error page title in it
        let test1 = res.text.includes('HTML did not pass validation')
        let test2 = res.text.includes('<h2>Warnings:</h2>')
        assert.equal(test1, true)
        assert.equal(test2, false)
        testApp.kill()
        done()
      })
    })
  })
})
