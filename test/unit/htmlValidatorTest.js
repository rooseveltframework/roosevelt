/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fkill = require('fkill')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const http = require('http')
const path = require('path')
const request = require('supertest')

describe('HTML Validator/Kill Validator Test', function () {
  // location of the test app
  const appDir = path.join(__dirname, '../app/htmlValidatorTest')

  // options that would be put into generateTestApp params
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc dir from util to the test app
    fse.copySync(path.join(appDir, '../../util/mvc'), path.join(appDir, 'mvc'))
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

  describe('HTML Validator Test', function () {
    it('should give back a validation error page if the htmlValidator is running and the app is trying to send back an html page with errors', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, test the htmlValidator by trying to recieve bad html page
      testApp.on('message', (params) => {
        // request the bad html page
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }
            // test the text returned to see if it has the validation error page title in it
            let test1 = res.text.includes('HTML did not pass validation')
            let test2 = res.text.includes('<h2>Errors:</h2>')
            assert.strictEqual(test1, true)
            assert.strictEqual(test2, true)
            // kill the validator and app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should load a page normally if the htmlValidator is enabled and the page being loaded has no errors', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, test to see if valid html will not cause an error
      testApp.on('message', (params) => {
        // get the plain html page
        request(`http://localhost:${params.port}`)
          .get('/HTMLTest')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }
            // test if the elements added into the plain HTML show in the response
            let test1 = res.text.includes('TitleX')
            let test2 = res.text.includes('headingX')
            let test3 = res.text.includes('sentence1X')
            let test4 = res.text.includes('sentence2X')
            assert.strictEqual(test1, true)
            assert.strictEqual(test2, true)
            assert.strictEqual(test3, true)
            assert.strictEqual(test4, true)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should allow warning logs if "showWarnings" is true', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, send a get request to the server
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // test the text returned to see if it has the validation error page title in it
            let test1 = res.text.includes('HTML did not pass validation')
            let test2 = res.text.includes('<h2>Warnings:</h2>')
            assert.strictEqual(test1, true)
            assert.strictEqual(test2, true)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should not allow warning logs if "showWarnings" is false', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, send a request to a page that has both html errors and warnings
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // test the text returned to see if it has the validation error page title in it
            let test1 = res.text.includes('HTML did not pass validation')
            let test2 = res.text.includes('<h2>Warnings:</h2>')
            assert.strictEqual(test1, true)
            assert.strictEqual(test2, false)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should try to validate the HTML if the response header does not have the exception value', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          exceptions: {
            requestHeader: 'partialtest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, request a page that has both html errors and warnings
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }
            // test the header exception in the app param is false or not there
            let test1 = typeof res.header.partialtest === 'undefined'
            assert.strictEqual(test1, true)
            // test the text returned to see if it has the validation error page title in it
            let test2 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test2, true)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should not try to validate the HTML if the response header has the exception value', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          exceptions: {
            requestHeader: 'partialtest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, request a page that has a unique response header
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/brokenHeaderTest')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }
            // test the header exception in the app param is false or not there
            let test1 = typeof res.header.partialtest === 'undefined'
            assert.strictEqual(test1, false)
            // test the text returned to see if it has the validation error page title in it
            let test2 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test2, false)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should not validate the html page when the request header sent to it has the exception value', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          exceptions: {
            requestHeader: 'partialtest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, request the broken page with a unique request header
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .set('partialtest', 'true')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }
            // test the header exception in the app param is false or not there
            let test1 = typeof res.header.partialtest === 'undefined'
            assert.strictEqual(test1, false)
            // check to see that the page did not validate
            let test2 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test2, false)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
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
          showWarnings: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          exceptions: {
            modelValue: '_disableValidatorTest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and start it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, and then check that the page has not been validated
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/brokenObjectTest')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // check to see that the page did not validate
            let test1 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test1, false)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should still validate the HTML page if the model in the response does not hold a value that is set in the exception param', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        viewEngine: [
          'html: teddy'
        ],
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          showWarnings: false,
          exceptions: {
            modelValue: '_disableValidatorTest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and start it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts,  check that the page has not been validated
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/brokenObject2Test')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // check to see that the page did not validate
            let test1 = res.text.includes('HTML did not pass validation')
            let test2 = res.text.includes('Errors:')
            assert.strictEqual(test1, true)
            assert.strictEqual(test2, true)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should try to validate the HTML page because the model in the response does not hold a value that is set in the exception param', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        viewEngine: [
          'html: teddy'
        ],
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          showWarnings: false,
          exceptions: {
            modelValue: '_disableValidatorTest'
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and start it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, check that the page has not been validated
      testApp.on('message', (params) => {
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // check to see tha tthe page did not validate
            let test1 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test1, true)
            // kill the validator and the app
            fkill(`:48888`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should be able to run the validator even if we change the validator\'s port number', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          },
          showWarnings: false,
          port: 3000
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts, see if we can send a request to the new port
      testApp.on('message', (params) => {
        request(`http://localhost:${params.htmlValidator.port}`)
          .get('/')
          .expect(200, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
            }

            // check to see that the page loaded
            let test1 = res.status
            assert.strictEqual(test1, 200)
            // kill the validator and the app
            fkill(`:3000`, { force: true }).then(() => {
              testApp.send('stop')
            }, (err) => {
              console.log(err)
              testApp.send('stop')
            })
          })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should be able to run the htmlValidator independently from the app if the separateProcess param is set to true', function (done) {
      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          showWarnings: false,
          separateProcess: {
            enable: true,
            autoKiller: false
          },
          port: 48888
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // test to see that the validator still works
      testApp.on('message', (params) => {
        // variable to check if we had an error on the test app
        let testAppError = false
        request(`http://localhost:${params.port}`)
          .get('/Broken')
          .expect(500, (err, res) => {
            if (err) {
              assert.fail(err)
              testApp.send('stop')
              testAppError = true
            }
            // check to see that the page did validate and failed
            let test1 = res.text.includes('HTML did not pass validation')
            assert.strictEqual(test1, true)
            testApp.send('stop')
          })

        // when the child process exits, try and make a request to the detached validator
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
                assert.strictEqual(test2, true)

                // kill the validator with fkill
                fkill(`:48888`, { force: true }).then(() => {
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
                }, (err) => {
                  console.log(err)
                  done()
                })
              })
          }
        })
      })
    })

    it('should not start another htmlValidator if one is already running on the same port', function (done) {
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
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the server starts , kill the app
      testApp.on('message', () => {
        testApp.send('stop')
      })

      // when the app exits, run another app and see if it grabs onto the validator made by the first app
      testApp.on('exit', () => {
        const testApp2 = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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

        // when the server starts, kill the 2nd app
        testApp2.on('message', () => {
          testApp2.send('stop')
        })

        // on 2nd app exit, kill the validator
        testApp2.on('exit', () => {
          fkill(`:2500`, { force: true }).then(() => {
            assert.strictEqual(startingHTMLValidator2Bool, false, 'The second app started a HTML Validator Server even though one was still going')
            assert.strictEqual(detachedValidatorFound2Bool, true, 'The second app was not able to find the old validator that was running from the previous app')
            assert.strictEqual(detachedValidatorListen2Bool, true, 'The second app is not listening to the validator that is currently running')
            done()
          }, (err) => {
            console.log(err)
            done()
          })
        })
      })
    })

    it('should quit initialization of the app if another process is using the port that user assigned for the HTMLValidator and it returns something other than the 200 http code', function (done) {
      // bool var to hold whether or not a specific log was outputted
      let requestFailedLogBool = false
      let twoProcessToPortsBool = false

      // create a dummy server that will give back a 500 error on the port that the html Validator wants to use
      let server = http.createServer(function (req, res) {
        res.statusCode = 500
        res.end()
      }).listen(43711)

      // create the app.js file
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        port: 6729,
        htmlValidator: {
          enable: true,
          port: 43711,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // look at the errors logs to see if specific log is outputted
      testApp.stderr.on('data', (data) => {
        if (data.includes('Request Failed.\nStatus Code: 500')) {
          requestFailedLogBool = true
        }
        if (data.includes('Another process that is not the HTMLValidator is using this port already. Quitting the initialization of your app')) {
          twoProcessToPortsBool = true
        }
      })

      // once app.js finishes initialization, kill it
      testApp.on('message', () => {
        testApp.send('stop')
      })

      // once the server made by app.js is done, kill the dummy server
      testApp.on('exit', () => {
        server.close()
      })

      // on dummy server closing, check to see if the correct error logs were outputted
      server.on('close', () => {
        assert.strictEqual(requestFailedLogBool, true, 'Roosevelt did not show the response code if the request failed')
        assert.strictEqual(twoProcessToPortsBool, true, 'Roosevelt did not give the reason for why the HTML Validator would not run')
        done()
      })
    })

    it('should stop the app from completing its initialization if another process is using the port the user assigned to the HTMLValidator', function (done) {
      // bool var to hold whether or not a specific log was outputted
      let twoProcessToPortsBool = false

      // make a dummy server that is on the port that the htmlValidator wants to go on and that returns a 200 status Code
      let server = http.createServer(function (req, res) {
        res.statusCode = 200
        res.end()
      }).listen(43711)

      // create the app.js file
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          port: 43711,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // check the error logs to see if the correct error log was outputted
      testApp.stderr.on('data', (data) => {
        if (data.includes('Another process that is not the HTMLValidator is using this port already. Quiting the initialization of your app')) {
          twoProcessToPortsBool = true
        }
      })

      // when app.js finishes initialization, kill it
      testApp.on('message', () => {
        testApp.send('stop')
      })

      // as app.js is closing, close the dummy server
      testApp.on('exit', () => {
        server.close()
      })

      // as the dummy server is closing, check that the correct error log was outputted
      server.on('close', () => {
        assert.strictEqual(twoProcessToPortsBool, true, 'Roosevelt did not stop the app from initializing if the port it wants the validator to use is being used by something else')
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
          separateProcess: {
            enable: true,
            autoKiller: false
          },
          port: 45231
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', (params) => {
        // close the htmlValidator
        fkill(`:45231`, { force: true }).then(() => {
          // request a bad page and see if the response shows that we cannot connect to the validator
          request(`http://localhost:${params.port}`)
            .get('/Broken')
            .expect(500, (err, res) => {
              if (err) {
                assert.fail(err)
                testApp.send('stop')
              }
              let test1 = res.text.includes('Cannot connect to validator')
              let test2 = res.text.includes('Unable to connect to HTML validator')
              assert.strictEqual(test1, true, 'Roosevelt either did not detect an error or did not give back the right page (pageTitle)')
              assert.strictEqual(test2, true, 'Roosevelt either did not detect an error or did not give back the right page (pageHeader)')
              testApp.send('stop')
            })
        }, (err) => {
          console.log(err)
          testApp.send('stop')
        })
      })

      // when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })

    it('should report that the validator should timeout if the amount of time given to it passes before it reports its listening to the port given to it', function (done) {
      // setup options so that it will enable the app to have a timer
      options.msgEnabled = true
      // bool var to hold whether a specific error log was outputted
      let validatorTimeOutBool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the message of starting the HTML Validator comes, send a response to the app to speed up its clock by 30 secs
      testApp.stdout.on('data', (data) => {
        if (data.includes('Starting HTML validator...')) {
          testApp.send('something')
        }
      })

      // on error logs, check if the error log was outputted
      testApp.stderr.on('data', (data) => {
        if (data.includes('HTML validator has been disabled because it has timed out.')) {
          validatorTimeOutBool = true
        }
      })

      // when the app is finished with initialization, kill it
      testApp.on('message', () => {
        testApp.send('stop')
      })

      // on exit, check to see if the log of the validator timing out was outputted
      testApp.on('exit', () => {
        assert.strictEqual(validatorTimeOutBool, true, 'Roosevelt did not report that it would time out if the amount of time given for time out passed')
        done()
      })
    })

    it('should give instruction to install java if the validator is called without having java installed on the machine', function (done) {
      // bool var to hold whether or not a specific error was triggered
      let javaEnonetErrorBool = false

      // generate the app.js file
      generateTestApp({
        appDir: appDir,
        generateFolderStructure: true,
        onServerStart: `(app) => {process.send(app.get("params"))}`,
        htmlValidator: {
          enable: true
        }
      }, options)

      // fork the app and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], env: { PATH: 'sfsfsff' } })

      // on error logs, check to see if any of them are the error log that we want
      testApp.stderr.on('data', (data) => {
        if (data.includes('Error: You must install Java to continue. HTML validation disabled, error on initialization (check to make sure Java is installed and in your path)')) {
          javaEnonetErrorBool = true
        }
      })

      // when the app finishes initialization, kill it
      testApp.on('message', () => {
        testApp.send('stop')
      })

      // when the app is exiting, see if the error was hit
      testApp.on('exit', () => {
        assert.strictEqual(javaEnonetErrorBool, true, 'The Path does not point to java, so we should get an error saying that the command of java was not recognised')
        done()
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
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // If the test errors, see if it is the specfic one about the two services trying to use the same port
      testApp.stderr.on('data', (data) => {
        if (data.includes('HTML validator are both trying to use the same port')) {
          samePortErrorBool = true
        }
      })

      // when we get a message from the app, signifying that the app is starting, kill it
      testApp.on('message', () => {
        fkill(`:2000`, { force: true }).then(() => {
          done()
        }, (err) => {
          console.log(err)
          done()
        })
      })

      // when the app is about to exit, see if the specifc error was outputted
      testApp.on('exit', () => {
        assert.strictEqual(samePortErrorBool, true, 'Roosevelt is not catching the error that describes 2 or more servers using a single port and giving a specific message to the programmer')
        const killLine = fork('lib/scripts/killValidator.js', { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

        killLine.on('exit', () => {
          done()
        })
      })
    })
  })

  describe('Roosevelt Kill Validator Test', function () {
    // msgEnabled to false so that new app doesn't have a sinon timer
    options.msgEnabled = false

    it('should output an error message if the kill validator script is used when the validator is not being used', function (done) {
      // bool var to hold whether or not the request failed status has been given
      let calledToScan = false
      let finalWarnBool = false

      // generate the app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: false,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      // fork the app.js file and run it as a child process
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // when the app starts, kill the app
      testApp.on('message', (params) => {
        testApp.send('stop')
      })

      // when the app is about to finish, fork the kill Validator
      testApp.on('exit', () => {
        const killLine = fork('lib/scripts/killValidator.js', [], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })
        killLine.stdout.on('data', data => {
          if (data.includes('Scanning for validator now...')) {
            calledToScan = true
          }
        })
        killLine.stderr.on('data', (data) => {
          if (data.includes('Could not find the validator at this time, please make sure that the validator is running.')) {
            finalWarnBool = true
          }
        })

        // on kill Validator's exit, check to see if the error logs outputted
        killLine.on('exit', () => {
          assert.strictEqual(calledToScan, true, 'Roosevelt calls to scan for the validator')
          assert.strictEqual(finalWarnBool, true, 'Roosevelt did not throw the message saying that it will stop looking for the validator')
          done()
        })
      })
    })

    it('should report that that the validator was found and killed', function (done) {
      let foundValidatorBool = false
      let killedValidatorBool = false

      // generate the test app
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false,
            autoKiller: false
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      // on the output stream, check for logs
      testApp.stdout.on('data', data => {
        if (data.includes('HTML validator listening on port')) {
          const killLine = fork('../../../lib/scripts/killValidator.js', [], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'], cwd: appDir })
          // check for the logs saying that the validator was found and killed
          killLine.stdout.on('data', data => {
            if (data.includes('Validator successfully found with PID')) {
              foundValidatorBool = true
            }
            if (data.includes('Killed process with PID')) {
              killedValidatorBool = true
            }
          })

          killLine.on('exit', () => {
            testApp.send('stop')
          })
        }
      })

      // when the child process exits, check assertions and finish the test
      testApp.on('exit', () => {
        assert.strictEqual(foundValidatorBool, true, 'killValidator was not able to find the validator')
        assert.strictEqual(killedValidatorBool, true, 'killValidator was unable to kill the validator')
        done()
      })
    })

    it('should output human readable times (hours) on autokiller instantiation', function (done) {
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true,
            autoKillerTimeout: 3600000
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      let hadIt = false
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.stdout.on('data', data => {
        if (data.includes('automatically kill the detached validator after 1 hour of inactivity')) {
          hadIt = true
          testApp.send('stop') // pass
        }
        if (data.includes('server listening on port')) {
          testApp.send('stop') // fail
        }
      })

      testApp.on('exit', () => {
        assert.strictEqual(hadIt, true, 'Human readable times (hours) did not output on autokiller instantiation')
        done()
      })
    })

    it('should output human readable times (minutes) on autokiller instantiation', function (done) {
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true,
            autoKillerTimeout: 600000 // 10 minutes
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      let hadIt = false
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.stdout.on('data', data => {
        if (data.includes('automatically kill the detached validator after 10 minutes of inactivity')) {
          hadIt = true
          testApp.send('stop') // pass
        }
        if (data.includes('server listening on port')) {
          testApp.send('stop') // fail
        }
      })

      testApp.on('exit', () => {
        assert.strictEqual(hadIt, true, 'Human readable times (minutes) did not output on autokiller instantiation')
        done()
      })
    })

    it('should output human readable times (seconds) on autokiller instantiation', function (done) {
      generateTestApp({
        generateFolderStructure: true,
        appDir: appDir,
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true,
            autoKillerTimeout: 10000 // 10 seconds
          }
        },
        onServerStart: `(app) => {process.send(app.get("params"))}`
      }, options)

      let hadIt = false
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.stdout.on('data', data => {
        if (data.includes('automatically kill the detached validator after 10 seconds of inactivity')) {
          hadIt = true
          testApp.send('stop') // pass
        }
        if (data.includes('server listening on port')) {
          testApp.send('stop') // fail
        }
      })

      testApp.on('exit', () => {
        assert.strictEqual(hadIt, true, 'Human readable times (seconds) did not output on autokiller instantiation')
        done()
      })
    })
  })
})
