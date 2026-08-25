const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('routing', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/routing')
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
    context.app.get('httpServer').close(() => {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    })
  })

  it('should respond to a route handled in a controller file', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30130 },
        appDir,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/HTMLTest`)
        if (res.status === 200 && res.data.includes('TitleX')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should resolve a request to a public file', (t, done) => {
    (async () => {
      let pass = false
      fs.ensureFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30131 },
        appDir,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}${context.app.get('routePrefix')}/text/hello.txt`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should respond to route hosted in a subdirectory via routePrefix', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30132 },
        appDir,
        expressSession: false,
        routePrefix: 'foo',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/foo/HTMLTest`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should resolve a request to a public file hosted in a subdirectory via routePrefix', (t, done) => {
    (async () => {
      let pass = false
      fs.ensureFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30133 },
        appDir,
        expressSession: false,
        routePrefix: 'foo',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}${context.app.get('routePrefix')}/text/hello.txt`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should be able to start the app normally without any controller errors, even though there is a non-controller file in the controller folder', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copyFileSync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'mvc/controllers/faviconTest.ico'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        appDir,
        expressSession: false,
        http: { port: 30152 }, // an explicit port rather than the default, which sits inside the range the os hands out for outbound connections and so can be taken by another process on the machine
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(capturedLogs => {
        if (capturedLogs.includes('Roosevelt Express HTTP server listening on port 30152 (production mode)')) pass = true
        else pass = false
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  // a controller that throws while loading is a normal thing to hit while developing, and these paths are what turn that into a message worth reading rather than a bare stack trace
  describe('when controllers cannot be loaded', () => {
    it('should name the 404 controller when it fails to load', async () => {
      // a 404.js inside the controllers folder replaces roosevelt's own, so a broken one lands in the 404 loading path rather than the general one
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/404.js'), 'throw new Error("this 404 controller is broken")\n')

      let captured = ''
      captureLogs.start()
      try {
        await roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { enable: false },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } }
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('failed to load 404 controller file'), `expected the 404 loading error, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(captured.includes('this 404 controller is broken'), 'the underlying error should be shown too')
    })

    it('should report a controllers path it cannot read at all', async () => {
      // a file where the folder should be makes reading the folder fail, rather than any single controller failing
      fs.outputFileSync(path.join(appDir, 'mvc/controllers'), 'not a directory\n')

      let captured = ''
      captureLogs.start()
      try {
        await roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { enable: false },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } }
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('could not load controller files from'), `expected the fatal controllers error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should keep serving the other controllers when only one of them is broken', async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/broken.js'), 'throw new Error("this controller is broken")\n')

      let captured = ''
      let app
      captureLogs.start()
      try {
        const rooseveltApp = roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { port: 30134 },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } },
          onServerStart: started => { app = started }
        })
        await rooseveltApp.startServer()
      } finally {
        captured = captureLogs.stop()
      }
      context.app = app

      assert.ok(captured.includes('failed to load controller file'), 'the broken controller should be named')

      const res = await axios.get('http://localhost:30134/HTMLTest')
      assert.strictEqual(res.status, 200, 'a controller that loaded fine should still be serving')
    })
  })
})
