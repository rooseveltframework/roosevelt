/* eslint-env mocha */
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('roosevelt.js', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app')

  // capture everything a roosevelt app logs to the console
  let capturedLogs = ''
  beforeEach(done => {
    capturedLogs = ''
    process.stdout.write = (chunk, encoding, callback) => {
      capturedLogs += chunk.toString()
      if (callback) callback()
    }
    process.stderr.write = (chunk, encoding, callback) => {
      capturedLogs += chunk.toString()
      if (callback) callback()
    }
    done()
  })

  // undo capturing everything logged to the console so that mocha can print results
  const originalStdoutWrite = process.stdout.write
  const originalStderrWrite = process.stderr.write
  function finish (cb) {
    process.stdout.write = originalStdoutWrite
    process.stderr.write = originalStderrWrite
    cb(capturedLogs)
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach(done => {
    if (!context?.app?.get) {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    }
    if (context.app.get('httpsServer')?.close) {
      let done1 = false
      let done2 = false
      context.app.get('httpServer').close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done1 = true
      })
      context.app.get('httpsServer')?.close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done2 = true
      })
      setTimeout(() => {
        if (done1 && done2) done()
      }, 100)
    } else {
      context.app.get('httpServer').close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done()
      })
    }
  })

  it('should set params correctly after initServer is called', done => {
    (async () => {
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.initServer()
      finish((capturedLogs) => {
        const params = context.app.get('params')
        const sampleJSON = {
          http: {
            port: 43711
          },
          viewEngine: 'none',
          favicon: 'none'
        }
        assert.strictEqual(params.port, sampleJSON.port, 'Roosevelt should make them the same if a param object is not passed in (port)')
        assert.strictEqual(params.viewEngine, sampleJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
        assert.strictEqual(params.favicon, sampleJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
        done()
      })
    })()
  })

  it('should only initialize the app once even though the startServer function is called after the initServer function', done => {
    (async () => {
      let count = 0
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
          count++
        }
      })
      await rooseveltApp.initServer()
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (count === 1) done()
        else done(new Error('initServer got called more or less than once'))
      })
    })()
  })

  it('should only initialize the app once even though initServer is called twice', done => {
    (async () => {
      let count = 0
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
          count++
        }
      })
      await rooseveltApp.initServer()
      await rooseveltApp.initServer()
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (count === 1) done()
        else done(new Error('initServer got called more or less than once'))
      })
    })()
  })

  it('should be able to run the app with the localhostOnly param set to true and in production mode', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        localhostOnly: true,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (capturedLogs.includes('Roosevelt Express will only respond to requests coming from localhost')) pass = true
        if (pass) done()
        else done(new Error('Expected log not shown'))
      })
    })()
  })

  it('should be able to run the app with localhostOnly set to true, in production mode, and run an HTTPS server', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        localhostOnly: true,
        https: {
          enable: true,
          port: 43203,
          autoCert: false
        },
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (capturedLogs.includes('Roosevelt Express will only respond to requests coming from localhost') && capturedLogs.includes('Roosevelt Express HTTPS server listening on port')) pass = true
        if (pass) done()
        else done(new Error('Expected log not shown'))
      })
    })()
  })

  it('should warn and quit the initialization of the roosevelt app if another process is using the same port that the app was assigned to', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const rooseveltApp2 = roosevelt({
          appDir,
          expressSession: false
        })
        await rooseveltApp2.startServer()
      } catch (err) {
        if (err.message.includes('listen EADDRINUSE')) pass = true
      }
      finish((capturedLogs) => {
        if (pass) done()
        else done(new Error('Expected log not shown'))
      })
    })()
  })

  it('should be able to close an active connection when the app is closed', done => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`)
      } catch (err) {}
      setTimeout(async () => {
        const interval = setInterval(() => {
          if (capturedLogs.includes('Roosevelt Express successfully closed all connections and shut down gracefully')) {
            clearInterval(interval)
            finish(capturedLogs => {
              done()
            })
          }
        }, 100)
        await rooseveltApp.stopServer()
        process.exit = originalProcessExit
      }, 100)
    })()
  })

  it('should force close all active connections and exit the process if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', done => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        shutdownTimeout: 500,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`).catch(err => {
          if (err) {
            // swallow err
          }
        })
      } catch (err) {}
      setTimeout(async () => {
        const interval = setInterval(() => {
          if (capturedLogs.includes('Roosevelt Express could not close all connections in time; forcefully shutting down')) {
            clearInterval(interval)
            finish(capturedLogs => {
              done()
            })
          }
        }, 100)
        await rooseveltApp.stopServer()
        process.exit = originalProcessExit
      }, 100)
    })()
  })

  it('should force close all active connections and close the HTTP & HTTPS server if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', done => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        shutdownTimeout: 500,
        https: {
          enable: true,
          port: 43203,
          autoCert: false
        },
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`).catch(err => {
          if (err) {
            // swallow err
          }
        })
      } catch (err) {}
      setTimeout(async () => {
        const interval = setInterval(() => {
          if (capturedLogs.includes('Roosevelt Express could not close all connections in time; forcefully shutting down')) {
            clearInterval(interval)
            finish(capturedLogs => {
              done()
            })
          }
        }, 100)
        await rooseveltApp.stopServer()
        process.exit = originalProcessExit
      }, 100)
    })()
  })
})
