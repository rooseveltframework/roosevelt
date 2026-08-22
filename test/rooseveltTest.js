const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('roosevelt.js', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/rooseveltTest')
  beforeEach((t, done) => {
    captureLogs.start()
    done()
  })

  // hands the test what the app has logged so far; collecting keeps running until the test ends, so anything logged afterwards is not printed
  function finish (cb) {
    cb(captureLogs.peek())
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach((t, done) => {
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

  it('should set params correctly after initServer is called', (t, done) => {
    (async () => {
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
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
            port: 43763
          },
          https: {
            port: 43711
          },
          viewEngine: 'none',
          favicon: 'none'
        }
        assert.strictEqual(params.http.port, sampleJSON.http.port, 'Roosevelt should make them the same if a param object is not passed in (http.port)')
        assert.strictEqual(params.https.port, sampleJSON.https.port, 'Roosevelt should make them the same if a param object is not passed in (https.port)')
        assert.strictEqual(params.viewEngine, sampleJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
        assert.strictEqual(params.favicon, sampleJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
        done()
      })
    })()
  })

  it('should not leave kill signal listeners behind after its servers close', async () => {
    // roosevelt listens for SIGTERM and SIGINT so it can shut down gracefully, but a process that starts several apps would accumulate those listeners and eventually trip node's memory leak warning
    const before = {
      SIGTERM: process.listenerCount('SIGTERM'),
      SIGINT: process.listenerCount('SIGINT')
    }

    const rooseveltApp = roosevelt({
      appDir,
      csrfProtection: false,
      expressSession: false,
      makeBuildArtifacts: false,
      htmlValidator: { enable: false },
      http: { enable: true, port: 30006 },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false } },
      onServerInit: app => {
        context.app = app
      }
    })

    await rooseveltApp.startServer()
    assert.strictEqual(process.listenerCount('SIGTERM'), before.SIGTERM + 1, 'a running app should be listening for SIGTERM')

    await rooseveltApp.stopServer({ persistProcess: true })
    assert.strictEqual(process.listenerCount('SIGTERM'), before.SIGTERM, 'SIGTERM listeners should be gone once the app has shut down')
    assert.strictEqual(process.listenerCount('SIGINT'), before.SIGINT, 'SIGINT listeners should be gone once the app has shut down')
  })

  it('should not leave kill signal listeners behind when its server is closed directly', async () => {
    // the listeners are keyed off the servers closing rather than off stopServer, so closing the server by hand cleans up too
    const before = process.listenerCount('SIGTERM')

    const rooseveltApp = roosevelt({
      appDir,
      csrfProtection: false,
      expressSession: false,
      makeBuildArtifacts: false,
      htmlValidator: { enable: false },
      http: { enable: true, port: 30007 },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false } },
      onServerInit: app => {
        context.app = app
      }
    })

    await rooseveltApp.startServer()
    await new Promise(resolve => rooseveltApp.expressApp.get('httpServer').close(resolve))

    assert.strictEqual(process.listenerCount('SIGTERM'), before, 'SIGTERM listeners should be gone once the server has closed')
  })

  it('should only initialize the app once even though the startServer function is called after the initServer function', (t, done) => {
    (async () => {
      let count = 0
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30121 },
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

  it('should only initialize the app once even though initServer is called twice', (t, done) => {
    (async () => {
      let count = 0
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30122 },
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

  it('should be able to run the app with the localhostOnly param set to true and in production mode', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30123 },
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

  it('should be able to run the app with localhostOnly set to true, in production mode, and run an HTTPS server', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30124 },
        appDir,
        expressSession: false,
        localhostOnly: true,
        https: {
          enable: true,
          port: 30005,
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

  it('should warn and quit the initialization of the roosevelt app if another process is using the same port that the app was assigned to', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30125 },
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const rooseveltApp2 = roosevelt({
          logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
          http: { port: 30125 }, // deliberately the same port as the app above, since a collision is the whole point of this test
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

  it('should be able to close an active connection when the app is closed', (t, done) => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30127 },
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
          if (captureLogs.peek().includes('Roosevelt Express successfully closed all connections and shut down gracefully')) {
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

  it('should force close all active connections and exit the process if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', (t, done) => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30128 },
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
          if (captureLogs.peek().includes('Roosevelt Express could not close all connections in time; forcefully shutting down')) {
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

  it('should force close all active connections and close the HTTP & HTTPS server if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', (t, done) => {
    (async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30129 },
        appDir,
        expressSession: false,
        shutdownTimeout: 500,
        https: {
          enable: true,
          port: 30005,
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
          if (captureLogs.peek().includes('Roosevelt Express could not close all connections in time; forcefully shutting down')) {
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
