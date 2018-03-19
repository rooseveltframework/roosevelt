/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt HTML Validator/ Kill Validator Test', function () {
  this.timeout(60000)

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

  describe('Roosevelt HTML Validator Test', function () {
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
        const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.on('exit', () => {
          done()
        })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
        })
      })
    })

    it('should be able to run the validator even if we change the port number of the validator', function (done) {
      this.timeout(60000)
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
          const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            done()
          })
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

        testApp.on('exit', () => {
          if (testAppError) {
            done()
          } else {
          // check to see if the validator is accessible (should get back 200)
            request(`http://localhost:${params.htmlValidator.port}`)
              .get('/')
              .expect(200, (err, res) => {
                if (err) {
                  assert.fail('was not able to connect to independently running htmlValidator')
                  done()
                }
                let test2 = res.text.includes('Ready to check  - Nu Html Checker')
                assert.equal(test2, true)

                // kill the validator with a fork or the killValidator script
                const killLine = fork('lib/scripts/killValidator', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

                killLine.on('exit', () => {
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
                })
              })
          }
        })
      })
    })

    it('should not be starting another htmlValidator if one is alreadly running on the same port', function (done) {
      // bool vars to hold whether or not specific logs have been outputted
      let startingHTMLValidator2Bool = false
      let detachedValidatorFound2Bool = false
      let detachedValidatorListen2Bool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 2500,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        testApp2.stdout.on('data', (data) => {
          if (data.includes('Detached validator found on port: 2500')) {
            detachedValidatorFound2Bool = true
          }
          if (data.includes('Starting HTML validator...')) {
            startingHTMLValidator2Bool = true
          }
          if (data.includes('HTML validator listening on port: 2500')) {
            detachedValidatorListen2Bool = true
          }
        })

        testApp2.on('message', () => {
          testApp2.kill('SIGINT')
        })

        testApp2.on('exit', () => {
          const killLine = fork('lib/scripts/killValidator.js', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

          killLine.on('exit', () => {
            assert.equal(startingHTMLValidator2Bool, false, 'The second app started a HTML Validator Server even though one was still going')
            assert.equal(detachedValidatorFound2Bool, true, 'The second app was not able to find the old validator that was running from the previous app')
            assert.equal(detachedValidatorListen2Bool, true, 'The second app is not listening to the validator that is currently running')
            done()
          })
        })
      })
    })

    it('should quit initialization of the app if another process is using the port that user assigned for the HTMLValidator and it returns something other than the 200 http code', function (done) {
      // bool var to hold whether or not a specific log was outputted
      let requestFailedLogBool = false
      let twoProcessToPortsBool = false
      // copy over a new controller into the mvc of the test App Dir
      fse.copySync(path.join(appDir, '../', '../', 'util', 'htmlValidatorError.js'), path.join(appDir, 'mvc', 'controllers', 'htmlValidatorError.js'))

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: false
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        generateTestApp({
          generateFolderStructure: true,
          appDir: appDir,
          port: 6729,
          htmlValidator: {
            enable: true,
            port: 43711,
            separateProcess: true
          },
          onServerStart: `(app) => {process.send(app.get("params"))}`
        }, options)

        // fork the app and run it as a child process
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        testApp2.stderr.on('data', (data) => {
          if (data.includes('Request Failed.\nStatus Code: 500')) {
            requestFailedLogBool = true
          }
          if (data.includes('Another process that is not the HTMLValidator is using this port already. Quiting the initialization of your app')) {
            twoProcessToPortsBool = true
          }
        })

        testApp2.on('message', () => {
          testApp2.kill('SIGINT')
        })

        testApp2.on('exit', () => {
          testApp.kill('SIGINT')
        })
      })
      testApp.on('exit', () => {
        assert.equal(requestFailedLogBool, true, 'Roosevelt did not show the response code if the request failed')
        assert.equal(twoProcessToPortsBool, true, 'Roosevelt did not give the reason for why the HTML Validator would not run')
        done()
      })
    })

    it('should stop the app from completing its initialization if another process is using the port the user assigned to the HTMLValidator', function (done) {
      // bool var to hold whether or not a specific log was outputted
      let twoProcessToPortsBool = false
      // copy over a new controller into the mvc of the test App Dir
      fse.copySync(path.join(appDir, '../', '../', 'util', 'htmlDefaultFile.js'), path.join(appDir, 'mvc', 'controllers', 'htmlDefaultFile.js'))

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: false
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        generateTestApp({
          generateFolderStructure: true,
          appDir: appDir,
          htmlValidator: {
            enable: true,
            port: 43711,
            separateProcess: true
          },
          onServerStart: `(app) => {process.send(app.get("params"))}`
        }, options)

        // fork the app and run it as a child process
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        testApp2.stderr.on('data', (data) => {
          if (data.includes('Another process that is not the HTMLValidator is using this port already. Quiting the initialization of your app')) {
            twoProcessToPortsBool = true
          }
        })

        testApp2.on('message', () => {
          testApp2.kill('SIGINT')
        })

        testApp2.on('exit', () => {
          testApp.kill('SIGINT')
        })
      })
      testApp.on('exit', () => {
        assert.equal(twoProcessToPortsBool, true, 'Roosevelt did not stop the app from initializing if the port it wants the validator to use is being used by something else')
        done()
      })
    })

    it('should give an error saying that it cannot connect to the htmlValidator if it is trying to access it after it was killed', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: true,
          port: 45231
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', (params) => {
        // close the htmlValidator
        const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.on('exit', () => {
          // request a bad page
          request(`http://localhost:${params.port}`)
            .get('/Broken')
            .expect(200, (err, res) => {
              if (err) {
                assert.fail(err)
                testApp.kill('SIGINT')
              }
              let test1 = res.text.includes('Cannot connect to validator')
              let test2 = res.text.includes('Unable to connect to HTML validator')
              assert.equal(test1, true, 'Roosevelt either did not detect an error or did not give back the right page (pageTitle)')
              assert.equal(test2, true, 'Roosevelt either did not detect an error or did not give back the right page (pageHeader)')
              testApp.kill('SIGINT')
            })
        })
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  describe('Roosevelt killValidator test', function () {
    it('should output an error messages if the kill Validator script is used when the validator is not being used', function (done) {
      this.timeout(60000)
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
        const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
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

    it('should be able to find the right port if the package.json is missing and the param port is not the default', function (done) {
      this.timeout(70000)
      // bool var that holds whether or not the validator was found or the validator was closed
      let validatorFoundBool = false
      let validatorClosedBool = false
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 52372,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process

      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      // when the app is starting, kill it
      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        const killLine = fork('lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorClosedBool, true, 'Roosevelt was not able to closed the HTML Validator on its seperate port')
          assert.equal(validatorFoundBool, true, 'Roosevelt was not able to find the HTML Validator on its seperate port')
          done()
        })
      })
    })

    it('should be able to grab the htmlValidator params from the package, apply it to the app and use it for the killValidator script', function (done) {
      this.timeout(70000)
      // bool var to hold whether or not the correct logs came out of killValidator
      let validatorFoundBool = false
      let validatorClosedBool = false
      let validatorDefaultNotFoundBool = false
      // js source string to hold the data for the package.json file
      let packageJson = {
        rooseveltConfig: {
          htmlValidator: {
            enable: true,
            port: 8293,
            separateProcess: true
          }
        }
      }

      // write the package.json to the Test App folder
      fse.ensureDir(appDir)
      fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson))

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      // when the app is about to quit, start the kill Validator script
      testApp.on('exit', () => {
        const killLine = fork('../../../lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], cwd: appDir})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.stderr.on('data', (data) => {
          if (data.includes('Could not find validator on port:')) {
            validatorDefaultNotFoundBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorFoundBool, true, 'killValidator was not able to find the port that the Validator is on, which is on the package.json file')
          assert.equal(validatorClosedBool, true, 'killValidator did not close the Validator')
          assert.equal(validatorDefaultNotFoundBool, false, 'killValidator was not able to find the Validator on the port it was given by package.json and has gone to scan the ports')
          done()
        })
      })
    })

    it('should be able to use killValidator to find a validator using the lowest port possible and kill it', function (done) {
      // bool var to hold whether or not the right logs are outputted
      let validatorFoundBool = false
      let validatorClosedBool = false

      // generate the app, the port of the html Validator cannot go lower than 1024 as jetty servers, which the htmlValidator is build with, requires root/admin permission to access ports lower than 1024
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 1024,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        const killLine = fork('lib/scripts/killValidator.js', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorFoundBool, true, 'killValidator was not able to find the port that the Validator is on')
          assert.equal(validatorClosedBool, true, 'killValidator did not close the Validator')
          done()
        })
      })
    })

    it('should be able to use killValidator to find a validator using the highest port possible and kill it', function (done) {
      // bool var to hold whether or not the right logs are outputted
      let validatorFoundBool = false
      let validatorClosedBool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 65535,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        const killLine = fork('lib/scripts/killValidator.js', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorFoundBool, true, 'killValidator was not able to find the port that the Validator is on')
          assert.equal(validatorClosedBool, true, 'killValidator did not close the Validator')
          done()
        })
      })
    })

    it('should be able to use killValidator to find a validator using the random port in between and kill it', function (done) {
      // bool var to hold whether or not the right logs are outputted
      let validatorFoundBool = false
      let validatorClosedBool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 29481,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        const killLine = fork('lib/scripts/killValidator.js', {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorFoundBool, true, 'killValidator was not able to find the port that the Validator is on')
          assert.equal(validatorClosedBool, true, 'killValidator did not close the Validator')
          done()
        })
      })
    })

    it('should report that both the validator and the app are trying to use the same port and that the user should change one of them', function (done) {
      // bool var to hold whether or not the correct error message was outputted
      let samePortErrorBool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        port: 2000,
        htmlValidator: {
          enable: true,
          port: 2000,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      // If the test errors, see if it is the specfic one about the two services trying to use the same port
      testApp.stderr.on('data', (data) => {
        if (data.includes('Both the roosevelt app and the validator are trying to access the same port. Please adjust one of the ports param to go to a different port')) {
          samePortErrorBool = true
        }
      })

      // when we get a message from the app, signifying that the app is starting, kill it
      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      // when the app is about to exit, see if the specifc error was outputted
      testApp.on('exit', () => {
        assert.equal(samePortErrorBool, true, 'Roosevelt is not catching the error that describes 2 or more servers using a single port and giving a specific message to the programmer')
        done()
      })
    })

    it('should be able to catch the 404 error that is given back if the path requested from the server does not exists', function (done) {
      // bool vars to hold whether or not a log was outputted
      let requestFailedBool = false

      // package.json source file
      let packageJson = {
        rooseveltConfig: {
          htmlValidator: {
            enable: true,
            port: 43711,
            separateProcess: true
          }
        }
      }

      // write the package.json file into the test app Directory
      fse.ensureDir(appDir)
      fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson))

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 2500,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      // when we get the message of the app finishing, run the killValidator script
      testApp.on('message', () => {
        // fork the kill validator script and run it as a child process
        const killLine = fork('../../../lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], cwd: appDir})

        // look at the errors and see if a specific error comes back
        killLine.stderr.on('data', (data) => {
          if (data.includes(`Request Failed.\nStatus Code:`)) {
            requestFailedBool = true
          }
        })

        killLine.on('exit', () => {
          testApp.kill('SIGINT')
        })
      })

      testApp.on('exit', () => {
        assert.equal(requestFailedBool, true, 'kill Validator does not catch the error that occurs when it tries to access a path on the server that does not exists')
        done()
      })
    })

    it('should be able to discern if the response from a server request to the port is not the right one and search for the right port', function (done) {
      // bool var to hold whether or not the correct logs came out of killValidator
      let validatorFoundBool = false
      let validatorClosedBool = false
      let foundAnotherPageBool = false
      let validatorDefaultNotFoundBool = false
      // js source string to hold the data for the package.json file
      let packageJson = {
        rooseveltConfig: {
          htmlValidator: {
            enable: true,
            port: 43711,
            separateProcess: true
          }
        }
      }
      // make the package.json file
      fse.ensureDir(appDir)
      fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson))
      // copy over a new controller into the mvc of the test App Dir
      fse.copySync(path.join(appDir, '../', '../', 'util', 'htmlDefaultFile.js'), path.join(appDir, 'mvc', 'controllers', 'htmlDefaultFile.js'))
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 2500,
          separateProcess: true
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)
      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.stdout.on('data', (data) => {
        if (data.includes('200') && data.includes('GET')) {
          foundAnotherPageBool = true
        }
      })

      testApp.on('message', () => {
        // fork the kill validator script and run it as a child process
        const killLine = fork('../../../lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], cwd: appDir})
        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundBool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })
        killLine.stderr.on('data', (data) => {
          if (data.includes('Could not find validator on port:')) {
            validatorDefaultNotFoundBool = true
          }
        })

        killLine.on('exit', () => {
          testApp.kill('SIGINT')
        })
      })
      testApp.on('exit', () => {
        assert.equal(validatorClosedBool, true, 'killValidator was not able to close the validator that was opened')
        assert.equal(validatorDefaultNotFoundBool, true, 'killValidator is translating the plainHTML page that it would get back from the roosevelt app as the HTML Validator')
        assert.equal(validatorFoundBool, true, 'killValidator was not able to find the validator')
        assert.equal(foundAnotherPageBool, true, 'The app made by Roosevelt has not given back the plainHTML page that it should')
        done()
      })
    })

    it('should default the killValidator port number to 8888 if the package.json htmlValidator does not specify what port the Validator should run on', function (done) {
      // bool vars to hold whether or not the right logs were outputted
      let validatorFoundon8888Bool = false
      let validatorClosedBool = false

      // js source string to hold the data for the package.json file
      let packageJson = {
        rooseveltConfig: {
          htmlValidator: {
            enable: true,
            separateProcess: true
          }
        }
      }

      // make the package.json file
      fse.ensureDir(appDir)
      fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson))
      // copy over a new controller into the mvc of the test App Dir
      fse.copySync(path.join(appDir, '../', '../', 'util', 'htmlDefaultFile.js'), path.join(appDir, 'mvc', 'controllers', 'htmlDefaultFile.js'))

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

      testApp.on('message', () => {
        testApp.kill('SIGINT')
      })

      testApp.on('exit', () => {
        // fork the kill validator script and run it as a child process
        const killLine = fork('../../../lib/scripts/killValidator.js', [], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], cwd: appDir})

        killLine.stdout.on('data', (data) => {
          if (data.includes('Validator successfully found on port')) {
            validatorFoundon8888Bool = true
          }
          if ((process.platform === 'darwin' || process.platform === 'linux') && data.includes('Killed process on port')) {
            validatorClosedBool = true
          } else if ((process.platform === 'win32') && data.includes('Validator successfully closed on port:')) {
            validatorClosedBool = true
          }
        })

        killLine.on('exit', () => {
          assert.equal(validatorFoundon8888Bool, true, 'Kill Validator was not looking on port 8888, which it should if the package.json htmlValidator does not specify a specific port')
          assert.equal(validatorClosedBool, true, 'Kill Validator did not close the HTML Validator')
          done()
        })
      })
    })
  })
})
