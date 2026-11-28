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
  //
  // each server still listening is closed and waited for, dropping any connection a request left open so the close does not wait out its keep alive timeout
  afterEach(async () => {
    for (const server of [context.app?.get('httpServer'), context.app?.get('httpsServer')]) {
      if (!server?.listening) continue
      await new Promise(resolve => {
        server.close(resolve)
        server.closeAllConnections?.()
      })
    }
    context.app = undefined
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // replaces process.exit for the length of a test that shuts an app down without persistProcess, which would otherwise end the test run
  async function withoutProcessExit (fn) {
    const originalProcessExit = process.exit
    process.exit = () => {}
    try {
      return await fn()
    } finally {
      process.exit = originalProcessExit
    }
  }

  // an app with the /longWait route that tells the test once a request to it is in flight, so a shutdown can be started while it is
  function longWaitApp (options) {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    let signalInFlight
    const inFlight = new Promise(resolve => { signalInFlight = resolve })
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      appDir,
      expressSession: false,
      onBeforeControllers: app => {
        app.use((req, res, next) => {
          if (req.path === '/longWait') signalInFlight()
          next()
        })
      },
      onServerStart: app => {
        context.app = app
      },
      ...options
    })
    return { rooseveltApp, inFlight }
  }

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
            port: 11637
          },
          https: {
            port: 11437
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
        if (pass && capturedLogs.includes('Another process is using port 30125')) done()
        else done(new Error('Expected log not shown'))
      })
    })()
  })

  it('should be able to close an active connection when the app is closed', async () => {
    const { rooseveltApp, inFlight } = longWaitApp({ http: { port: 30127 } })
    await rooseveltApp.startServer()
    await withoutProcessExit(async () => {
      const request = axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`)
      await inFlight
      await rooseveltApp.stopServer()
      const res = await request
      assert.strictEqual(res.status, 200, 'the request in flight should be allowed to finish')
      assert.strictEqual(res.data, 'longWait done')
    })
    assert.ok(captureLogs.peek().includes('Roosevelt Express successfully closed all connections and shut down gracefully'))
  })

  it('should settle the promise stopServer returns when it has to wait for a connection to close first', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30153 },
      appDir,
      expressSession: false,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()

    // a connection still open when the shutdown starts, which it waits for, and which closes a moment later. windows reports a closed connection later than other platforms, so an ordinary request can still be open when a test stops the app there
    const socket = require('net').connect(30153, 'localhost')
    await new Promise(resolve => socket.on('connect', resolve))
    await new Promise(resolve => setTimeout(resolve, 50)) // for the server to have seen it

    const stopping = rooseveltApp.stopServer({ persistProcess: true })
    setTimeout(() => socket.destroy(), 100)
    const outcome = await Promise.race([stopping.then(() => 'stopped'), new Promise(resolve => setTimeout(() => resolve('still pending after 5 seconds'), 5000))])
    assert.strictEqual(outcome, 'stopped')
  })

  it('should force close all active connections and exit the process if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', async () => {
    const { rooseveltApp, inFlight } = longWaitApp({ http: { port: 30128 }, shutdownTimeout: 500 })
    await rooseveltApp.startServer()
    await withoutProcessExit(async () => {
      const request = axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`).then(() => 'completed', err => err.code)
      await inFlight
      await rooseveltApp.stopServer()
      assert.notStrictEqual(await request, 'completed', 'the request in flight should have been cut off')
    })
    assert.ok(captureLogs.peek().includes('Roosevelt Express could not close all connections in time; forcefully shutting down'))
  })

  it('should force close all active connections and close the HTTP & HTTPS server if the time allotted in the shutdownTimeout has past after shutdown was called and a connection was still active', async () => {
    const { rooseveltApp, inFlight } = longWaitApp({
      http: { port: 30129 },
      shutdownTimeout: 500,
      https: {
        enable: true,
        port: 30005,
        autoCert: false
      }
    })
    await rooseveltApp.startServer()
    await withoutProcessExit(async () => {
      const request = axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`).then(() => 'completed', err => err.code)
      await inFlight
      await rooseveltApp.stopServer()
      assert.notStrictEqual(await request, 'completed', 'the request in flight should have been cut off')
    })
    assert.ok(captureLogs.peek().includes('Roosevelt Express could not close all connections in time; forcefully shutting down'))
  })

  it('should clean up after a forced shutdown the way it does after a graceful one', async () => {
    let sessionStoreClosed = false
    const { rooseveltApp, inFlight } = longWaitApp({
      http: { port: 30267 },
      shutdownTimeout: 300,
      logging: { methods: { http: false, info: false, error: false } }
    })
    await rooseveltApp.startServer()
    context.app.set('expressSessionStore', { close: () => { sessionStoreClosed = true } }) // stands in for the postgres store, whose timer would keep the process running
    const request = axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`).catch(() => {})
    await inFlight
    await rooseveltApp.stopServer({ persistProcess: true })
    await request
    assert.strictEqual(context.app.get('roosevelt:state'), null, 'the app should no longer be marked as disconnecting')
    assert.strictEqual(context.app.get('staticsWatchers'), null, 'the file watchers should be closed')
    assert.ok(sessionStoreClosed, 'the session store should be closed')
    assert.strictEqual(context.app.get('httpServer').listening, false, 'the server should be closed')
  })

  it('should wait on the shutdown already under way rather than starting another', async () => {
    let appExits = 0
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30268 },
      appDir,
      expressSession: false,
      onAppExit: () => appExits++,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const first = rooseveltApp.stopServer({ persistProcess: true })
    const second = rooseveltApp.stopServer({ persistProcess: true })
    assert.strictEqual(second, first, 'the second call should get the first call\'s promise')
    await first
    assert.strictEqual(appExits, 1, 'onAppExit should fire once')
    assert.strictEqual(context.app.get('roosevelt:state'), null)
  })

  it('should stop accepting new connections as soon as a shutdown starts', async () => {
    const { rooseveltApp, inFlight } = longWaitApp({ http: { port: 30269 } })
    await rooseveltApp.startServer()
    const request = axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`)
    await inFlight
    const stopping = rooseveltApp.stopServer({ persistProcess: true })
    const newConnection = await new Promise(resolve => {
      const attempt = require('net').connect(30269, '127.0.0.1')
      attempt.on('error', err => resolve(err.code))
      attempt.on('connect', () => {
        attempt.destroy()
        resolve('connected')
      })
    })
    assert.strictEqual(newConnection, 'ECONNREFUSED')
    assert.strictEqual((await request).data, 'longWait done', 'the request in flight should still finish')
    await stopping
  })

  it('should reject startServer\'s promise when onServerStart throws, rather than leaving it pending', async () => {
    const unhandled = []
    const onUnhandled = reason => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false, info: false } },
        http: { port: 30266 },
        appDir,
        expressSession: false,
        onServerStart: app => {
          context.app = app
          throw new Error('onServerStart failed')
        }
      })
      const outcome = await Promise.race([
        rooseveltApp.startServer().then(() => 'resolved', err => err.message),
        new Promise(resolve => setTimeout(() => resolve('still pending after 5 seconds'), 5000))
      ])
      assert.strictEqual(outcome, 'onServerStart failed')
      await new Promise(resolve => setImmediate(resolve))
      assert.deepStrictEqual(unhandled, [], 'nothing should be left unhandled')
    } finally {
      process.removeListener('unhandledRejection', onUnhandled)
    }
  })

  it('should reject with a clear error rather than exit when the HTTPS cert is empty', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      appDir,
      expressSession: false,
      http: { enable: false },
      https: { enable: true, port: 30270, autoCert: false, options: { cert: 'not a certificate', key: 'not a key' } }
    })
    context.app = rooseveltApp.expressApp
    await assert.rejects(withoutProcessExit(() => rooseveltApp.startServer()), /HTTPS cert appears to be empty.*roosevelt-generate-certs/)
  })

  it('should reject with a clear error when the HTTPS options cannot be used for another reason', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      appDir,
      expressSession: false,
      http: { enable: false },
      https: { enable: true, port: 30271, autoCert: false, options: { pfx: Buffer.from('not a pfx file') } }
    })
    context.app = rooseveltApp.expressApp
    await assert.rejects(rooseveltApp.startServer(), err => {
      assert.match(err.message, /Cannot start HTTPS server because the HTTPS options could not be used/)
      assert.ok(err.cause, 'the original error should be kept as the cause')
      return true
    })
  })

  it('should listen on 127.0.0.1 when localhostOnly is set, so a web server in front that connects to 127.0.0.1 is not refused', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30483 },
      appDir,
      expressSession: false,
      localhostOnly: true,
      onServerInit: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    assert.strictEqual(context.app.get('httpServer').address().address, '127.0.0.1')
  })

  it('should wait for an asynchronous onAppExit to finish before the promise stopServer returns settles', async () => {
    let appExitFinished = false
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30484 },
      appDir,
      expressSession: false,
      onAppExit: async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        appExitFinished = true
      },
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    await rooseveltApp.stopServer({ persistProcess: true })
    assert.ok(appExitFinished, 'onAppExit should have finished first')
  })

  it('should log an onAppExit that fails rather than crash or stop the shutdown', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30485 },
      appDir,
      expressSession: false,
      onAppExit: async () => { throw new Error('onAppExit went wrong') },
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    await rooseveltApp.stopServer({ persistProcess: true })
    assert.ok(captureLogs.peek().includes('onAppExit went wrong'), 'the failure should be logged')
    assert.strictEqual(context.app.get('httpServer').listening, false, 'the shutdown should still have finished')
  })

  it('should stop waiting for an onAppExit that never finishes once the shutdown timeout runs out', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30486 },
      appDir,
      expressSession: false,
      shutdownTimeout: 200,
      onAppExit: () => new Promise(() => {}),
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    await rooseveltApp.stopServer({ persistProcess: true })
    assert.ok(captureLogs.peek().includes('onAppExit event did not finish in time'))
  })

  it('should not report an error a server raises after it started listening as another process using its port', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false } },
      http: { port: 30487 },
      appDir,
      expressSession: false,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const err = new Error('something else went wrong with the server')
    err.code = 'ESOMETHINGELSE'
    context.app.get('httpServer').emit('error', err)
    const logs = captureLogs.peek()
    assert.ok(logs.includes('something else went wrong with the server'), 'the error should still be logged')
    assert.ok(!logs.includes('Another process is using port'), 'it should not be called a port conflict')
  })
})
