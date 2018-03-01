/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt HTML Validator Test', function () {
  this.timeout(20000)

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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message that we get back that the server has started, test the htmlValidator by trying to recieve a bad html page
    testApp.on('message', (params) => {
      // request the bad html page
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // test the text returned to see if it has the validation error page title in it
          let test1 = res.text.includes('HTML did not pass validation')
          let test2 = res.text.includes('<h2>Errors:</h2>')
          assert.equal(test1, true)
          assert.equal(test2, true)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // On getting the message back from the server, test to see that a good html will be past back even with the validator on
    testApp.on('message', (params) => {
      // get the plain html page
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
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
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // test the text returned to see if it has the validation error page title in it
          let test1 = res.text.includes('HTML did not pass validation')
          let test2 = res.text.includes('<h2>Warnings:</h2>')
          assert.equal(test1, true)
          assert.equal(test2, true)
          testApp.kill('SIGINT')
        })
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not allow warnigns to show up if "suppressWarnings" is true', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // test the text returned to see if it has the validation error page title in it
          let test1 = res.text.includes('HTML did not pass validation')
          let test2 = res.text.includes('<h2>Warnings:</h2>')
          assert.equal(test1, true)
          assert.equal(test2, false)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should try to validate the HTML if the response header does not have the exception value', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        exceptions: {
          requestHeader: 'partialtest'
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // test the header exception in the app param is false or not there
          let test1 = typeof res.header.partialtest === 'undefined'
          assert.equal(test1, true)
          // test the text returned to see if it has the validation error page title in it
          let test2 = res.text.includes('HTML did not pass validation')
          assert.equal(test2, true)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should not try to validate the HTML if the response header has the exception value', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        exceptions: {
          requestHeader: 'partialtest'
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/brokenHeaderTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }
          // test the header exception in the app param is false or not there
          let test1 = typeof res.header.partialtest === 'undefined'
          assert.equal(test1, false)
          // test the text returned to see if it has the validation error page title in it
          let test2 = res.text.includes('HTML did not pass validation')
          assert.equal(test2, false)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should not validate the html page when the request header sent to it has the exception value', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        exceptions: {
          requestHeader: 'partialtest'
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .set('partialtest', 'true')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // test the header exception in the app param is false or not there
          let test1 = typeof res.header.partialtest === 'undefined'
          assert.equal(test1, false)
          // check to see that the page did not validate
          let test2 = res.text.includes('HTML did not pass validation')
          assert.equal(test2, false)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should not try to validate the HTML page because the model in the response holds a value that is set in the exception param', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      viewEngine: [
        'html: teddy'
      ],
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        exceptions: {
          modelValue: '_disableValidatorTest'
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and start it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // wait for the server to start, and then check that the page has not been validated
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/brokenObjectTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // check to see that the page did not validate
          let test1 = res.text.includes('HTML did not pass validation')
          assert.equal(test1, false)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should try to validate the HTML page because the model in the response does not holds a value that is set in the exception param', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      viewEngine: [
        'html: teddy'
      ],
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        exceptions: {
          modelValue: '_disableValidatorTest'
        }
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and start it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // wait for the server to start, and then check that the page has not been validated
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // check to see tha tthe page did not validate
          let test1 = res.text.includes('HTML did not pass validation')
          assert.equal(test1, true)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should be able to run the validator even if we change the port number of the validator', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        port: 3000
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the server coming to life, see if we can send a request to the new port
    testApp.on('message', (params) => {
      request(`http://localhost:${params.htmlValidator.port}`)
        .get('/')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
          }

          // check to see that the page loaded
          let test1 = res.status
          assert.equal(test1, 200)
          testApp.kill('SIGINT')
        })
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should be able to run the htmlValidator independently from the app if the seperateProcess param is set to true', function (done) {
    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: true,
        suppressWarnings: true,
        separateProcess: true,
        port: 8888
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test to see that the validator still works
    testApp.on('message', (params) => {
      // variable to check if we had an error on the test app
      let testAppError = false
      request(`http://localhost:${params.port}`)
        .get('/Broken')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.kill('SIGINT')
            testAppError = true
          }
          // check to see that the page did validate and failed
          let test1 = res.text.includes('HTML did not pass validation')
          assert.equal(test1, true)
          testApp.kill('SIGINT')
        })

      // check to see if the validator is accessible (should get back 200)
      request(`http://localhost:${params.htmlValidator.port}`)
        .get('/')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            const killLine = fork('lib/scripts/killValidator', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
            testAppError = true
            killLine.kill('SIGINT')
          }
          let test2 = res.text.includes('Ready to check  - Nu Html Checker')
          assert.equal(test2, true)
        })

      // kill the validator with a fork or the killValidator script
      const killLine = fork('lib/scripts/killValidator', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      killLine.on('exit', () => {
        if (testAppError === false) {
          // see that the validator is no longer listening
          request(`http://localhost:${params.htmlValidator.port}`)
            .get('/')
            .expect(200, (err, res) => {
              if (err) {
                done()
              } else {
                assert.fail('we were able to load the validator even after it was killed')
                done()
              }
            })
        } else {
          done()
        }
      })
      testApp.on('exit', () => {
        if (testAppError) {
          done()
        }
      })
    })
  })

  it('should output an error messages if the kill Validator script is used when the validator is not being used', function (done) {
    // bool var to hold whether or not the request failed status has been given
    let requestFailedLogBool = false
    let finalWarnBool = false

    // generate the app
    generateTestApp({
      generateFolderStructure: true,
      appDir: appDir,
      htmlValidator: {
        enable: false
      },
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app starts, kill the app
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // when the app is about to finish, fork the kill Validator
    testApp.on('exit', () => {
      const killLine = fork('lib/scripts/killValidator', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
      killLine.stderr.on('data', (data) => {
        if (data.includes('Could not find validator on port: 8888. Scanning for validator now...')) {
          requestFailedLogBool = true
        }
        if (data.includes('Could not find the validator at this time, please make sure that the validator is running.')) {
          finalWarnBool = true
        }
      })

      killLine.on('exit', () => {
        assert.equal(requestFailedLogBool, true, 'Roosevelt did not throw a message saying that it could not find the validator after we shut it down')
        assert.equal(finalWarnBool, true, 'Roosevelt did not throw the message saying that it will stop looking for the validator')
        done()
      })
    })
  })
})
