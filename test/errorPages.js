const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('error pages', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/errorPages')
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

  it('should render the default 404 page if there is a request for an invalid route', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30104 },
        appDir,
        csrfProtection: false,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
      } catch (err) {
        if (err.status === 404 && !err.response.data.includes('404 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render a custom 404 page if there is a request for an invalid route and the 404 parameter is set', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/404test.js'), path.join(appDir, 'mvc/controllers/404test.js'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30105 },
        appDir,
        csrfProtection: false,
        expressSession: false,
        errorPages: {
          notFound: '404test.js'
        },
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
      } catch (err) {
        if (err.status === 404 && err.response.data.includes('404 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render the default 500 error page if an error has occured on the server', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30106 },
        appDir,
        csrfProtection: false,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/serverError`)
      } catch (err) {
        if (err.status === 500 && !err.response.data.includes('500 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render a custom 500 page if there is a request for a route that will respond with a server error and the 500 parameter is set', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/500test.js'), path.join(appDir, 'mvc/controllers/500test.js'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30107 },
        appDir,
        csrfProtection: false,
        expressSession: false,
        errorPages: {
          internalServerError: '500test.js'
        },
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/serverError`)
      } catch (err) {
        if (err.status === 500 && err.response.data.includes('500 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should complete the request even though the server was closed in the middle of it and respond 503 to any other request made afterwards', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/503test.js'), path.join(appDir, 'mvc/controllers/503test.js'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30108 },
        appDir,
        csrfProtection: false,
        expressSession: false,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        setTimeout(async () => {
          await rooseveltApp.stopServer()
        }, 500)
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`)
        if (res.status === 200 && res.data.includes('longWait done')) pass = true
        else pass = false
        await axios.get(`http://localhost:${context.app.get('params').http.port}/`)
      } catch (err) {
        if (err.status === 503 && err.response.data.includes('503 Service Unavailable')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        process.exit = originalProcessExit
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  // roosevelt builds a debug panel in development mode by flattening the error, request, and response objects into something a browser console can inspect
  // none of that runs in production, which is the mode the tests above use, so it went unexercised
  describe('development mode debug markup', () => {
    async function startDevApp (port) {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))

      const rooseveltApp = roosevelt({
        mode: 'development',
        logging: { methods: { http: false, info: false, warn: false, error: false } },
        http: { port },
        appDir,
        csrfProtection: false,
        expressSession: false,
        htmlValidator: { enable: false },
        frontendReload: { enable: false },
        onServerStart: app => { context.app = app }
      })
      await rooseveltApp.startServer()
    }

    it('should put the request and response context on the 404 page', async () => {
      await startDevApp(30105)

      let body = ''
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/aRouteThatDoesNotExist`)
      } catch (err) {
        body = err.response.data
      }

      assert.ok(body.includes('const req ='), 'the page should carry the flattened request')
      assert.ok(body.includes('const res ='), 'the page should carry the flattened response')
      assert.ok(body.includes('Route list:'), 'the page should list the routes')
    })

    it('should put the error, request, and response context on the 500 page', async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      await startDevApp(30106)

      let body = ''
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/serverError`)
      } catch (err) {
        body = err.response.data
      }

      assert.ok(body.includes('const err ='), 'the page should carry the flattened error')
      assert.ok(body.includes('const req ='), 'the page should carry the flattened request')
      assert.ok(body.includes('This request failed because there was an error in the Express server'), 'the page should explain what happened')
    })

    it('should mark circular references rather than recursing forever', async () => {
      await startDevApp(30107)

      let body = ''
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/aRouteThatDoesNotExist`)
      } catch (err) {
        body = err.response.data
      }

      // a request object points back at itself through several properties, so flattening it can only finish by noticing that
      assert.ok(body.includes('[Circular]'), 'a value that points back at something already flattened should be marked rather than followed')
    })

    it('should produce markup a browser can actually parse', async () => {
      await startDevApp(30108)

      let body = ''
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/aRouteThatDoesNotExist`)
      } catch (err) {
        body = err.response.data
      }

      // the flattened context is written into a script tag, so it has to be valid json
      const match = body.match(/const req = (\{.*?\})\n/s)
      assert.ok(match, 'the request context should be embedded in the page')
      assert.doesNotThrow(() => JSON.parse(match[1]), 'the embedded context should be valid JSON')
    })
  })
})
