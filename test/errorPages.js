const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const net = require('net')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('error pages', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/errorPages')
  beforeEach(() => {
    captureLogs.start()
  })

  // closes whichever of the app's servers are still listening, dropping any connection a request left open so the close does not wait out its keep alive timeout
  async function closeServers (app) {
    for (const server of [app?.get('httpServer'), app?.get('httpsServer')]) {
      if (!server?.listening) continue
      await new Promise(resolve => {
        server.close(resolve)
        server.closeAllConnections?.()
      })
    }
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach(async () => {
    await closeServers(context.app)
    context.app = undefined
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // an error page is an error status, which axios rejects with, so this hands back the response whichever way it came
  async function get (url) {
    try {
      return await axios.get(url)
    } catch (err) {
      if (!err.response) throw err
      return err.response
    }
  }

  it('should render the default 404 page if there is a request for an invalid route', async () => {
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
    const res = await get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
    assert.strictEqual(res.status, 404)
    assert.ok(res.data.includes('<title>404 Not Found</title>'), 'the page should be roosevelt\'s default 404 page')
    assert.ok(res.data.includes('The requested URL /randomURL was not found on this server.'))
  })

  it('should render a custom 404 page if there is a request for an invalid route and the 404 parameter is set', async () => {
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
    const res = await get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
    assert.strictEqual(res.status, 404)
    assert.ok(res.data.includes('404 custom test error page'))
  })

  it('should render the default 500 error page if an error has occured on the server', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, error: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run; the error is logged, and that is expected here
      http: { port: 30106 },
      appDir,
      csrfProtection: false,
      expressSession: false,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const res = await get(`http://localhost:${context.app.get('params').http.port}/serverError`)
    assert.strictEqual(res.status, 500)
    assert.ok(res.data.includes('<title>500 Internal Server Error</title>'), 'the page should be roosevelt\'s default 500 page')
    assert.ok(res.data.includes('The requested URL /serverError is temporarily unavailable at this time.'))
  })

  it('should render a custom 500 page if there is a request for a route that will respond with a server error and the 500 parameter is set', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    fs.copySync(path.join(__dirname, './util/500test.js'), path.join(appDir, 'mvc/controllers/500test.js'))
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, error: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run; the error is logged, and that is expected here
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
    const res = await get(`http://localhost:${context.app.get('params').http.port}/serverError`)
    assert.strictEqual(res.status, 500)
    assert.ok(res.data.includes('500 custom test error page'))
  })

  // an app whose onBeforeControllers adds routes of the test's own, which run ahead of the app's controllers and hand their errors to the same error page
  async function startAppWithRoutes (port, addRoutes) {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port },
      appDir,
      csrfProtection: false,
      expressSession: false,
      onBeforeControllers: addRoutes,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
  }

  it('should title the error page after the status the error carries, and log a client error as a warning rather than a stack trace', async () => {
    await startAppWithRoutes(30480, () => {})
    let res
    try {
      res = await axios.post('http://localhost:30480/anything', { big: 'x'.repeat(200 * 1024) }) // larger than the json body parser's default limit of 100kb
    } catch (err) {
      res = err.response
    }
    assert.strictEqual(res.status, 413)
    assert.ok(res.data.includes('<title>413 Payload Too Large</title>'), `the page should be titled after the status: ${res.data}`)
    assert.ok(!res.data.includes('Internal Server Error'), 'a client error should not be called a server error')
    assert.ok(!res.data.includes('temporarily unavailable'), 'a client error should not be described as the server being unavailable')
    const logs = captureLogs.peek()
    assert.ok(logs.includes('413 POST /anything'), `the client error should be logged in one line: ${logs}`)
    assert.ok(!logs.includes('    at '), 'a client error should not log a stack trace')
  })

  it('should treat an error whose status is not an error status as a 500', async () => {
    await startAppWithRoutes(30481, app => {
      app.get('/badStatus', (req, res, next) => {
        const err = new Error('a status that is not a number')
        err.status = 'abc'
        next(err)
      })
    })
    const res = await get('http://localhost:30481/badStatus')
    assert.strictEqual(res.status, 500)
    assert.ok(res.data.includes('<title>500 Internal Server Error</title>'))
  })

  it('should leave a response already under way to express rather than try to render an error page over it', async () => {
    await startAppWithRoutes(30482, app => {
      app.get('/halfSent', (req, res, next) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.write('the start of a response')
        next(new Error('failed partway through'))
      })
    })
    // express's own final handler reports the error on the console, which is collected here both to keep it out of the test output and to check it is the route's error rather than one from rendering a page over the response
    const consoleErrors = []
    const realConsoleError = console.error
    console.error = (...args) => consoleErrors.push(args.map(String).join(' '))
    let outcome
    try {
      // the connection is cut off, since the response cannot be finished properly
      outcome = await axios.get('http://localhost:30482/halfSent').then(() => 'completed', err => err.code || err.message)
      await new Promise(resolve => setTimeout(resolve, 50)) // for anything logged afterwards
    } finally {
      console.error = realConsoleError
    }
    assert.notStrictEqual(outcome, 'completed', 'the half sent response should not look complete')
    const logs = captureLogs.peek() + consoleErrors.join('\n')
    assert.ok(!logs.includes('ERR_HTTP_HEADERS_SENT') && !logs.includes('Cannot set headers'), `the error page should not have been rendered over the response: ${logs}`)
  })

  it('should complete the request even though the server was closed in the middle of it, respond 503 to any other request made afterwards, and refuse new connections', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    let stopping
    let signalInFlight
    const inFlight = new Promise(resolve => { signalInFlight = resolve })
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30108 },
      appDir,
      csrfProtection: false,
      expressSession: false,
      onBeforeControllers: app => {
        // the app is stopped from inside the request, so the request is known to be in flight when the shutdown starts
        app.use((req, res, next) => {
          if (req.path === '/longWait') {
            stopping = rooseveltApp.stopServer({ persistProcess: true })
            signalInFlight()
          }
          next()
        })
      },
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()

    // a raw connection, so the second request can be sent down the same connection as the one in flight, which is how a request reaches an app that has stopped taking new connections
    const socket = net.connect(30108, '127.0.0.1')
    let received = ''
    socket.setEncoding('utf8')
    socket.on('data', chunk => { received += chunk })
    const socketClosed = new Promise(resolve => socket.on('close', resolve))
    await new Promise(resolve => socket.on('connect', resolve))
    socket.write('GET /longWait HTTP/1.1\r\nHost: localhost\r\n\r\n')
    await inFlight
    socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')

    // and a new connection, which a shutting down app no longer takes
    const newConnection = await new Promise(resolve => {
      const attempt = net.connect(30108, '127.0.0.1')
      attempt.on('error', err => resolve(err.code))
      attempt.on('connect', () => {
        attempt.destroy()
        resolve('connected')
      })
    })
    assert.strictEqual(newConnection, 'ECONNREFUSED', 'a new connection should be refused once the shutdown has started')

    await socketClosed
    await stopping

    const second = received.indexOf('HTTP/1.1 503')
    assert.ok(received.startsWith('HTTP/1.1 200'), `the request in flight should finish normally: ${received.slice(0, 200)}`)
    assert.ok(received.slice(0, second === -1 ? undefined : second).includes('longWait done'), 'the request in flight should get its own response')
    assert.ok(second !== -1, `the request made after the shutdown started should get a 503: ${received}`)
    assert.ok(received.slice(second).includes('503 Service Unavailable'))
    assert.strictEqual(context.app.get('roosevelt:state'), null, 'the app should no longer be marked as disconnecting')
  })

  // roosevelt builds a debug panel in development mode by flattening parts of the error, request, and response objects into something a browser console can inspect
  //
  // none of that runs in production, which is the mode the tests above use, so it went unexercised
  describe('development mode debug markup', () => {
    async function startDevApp (port, options = {}) {
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
        onServerStart: app => { context.app = app },
        ...options
      })
      await rooseveltApp.startServer()
    }

    // a request sent exactly as written, since axios would encode what these tests need left as it is
    function rawGet (port, requestPath, headers = {}) {
      return new Promise((resolve, reject) => {
        const request = require('http').request({ host: 'localhost', port, path: requestPath, headers }, response => {
          let body = ''
          response.setEncoding('utf8')
          response.on('data', chunk => { body += chunk })
          response.on('end', () => resolve({ status: response.statusCode, body }))
        })
        request.on('error', reject)
        request.end()
      })
    }

    // routes for the tests below, added ahead of the app's controllers
    function debugRoutes (app) {
      app.get('/debugMarkup/locals', (req, res) => res.json({ hasDebugMarkup: 'debugMarkup' in res.locals }))
      app.get('/debugMarkup/htmlError', (req, res, next) => next(new Error('<b>bold</b> and </script><i>after</i>')))
    }

    it('should not build debug markup for a request that is not shown an error page', async () => {
      await startDevApp(30260, { onBeforeControllers: debugRoutes })
      const response = await axios.get(`http://localhost:${context.app.get('params').http.port}/debugMarkup/locals`)
      assert.deepStrictEqual(response.data, { hasDebugMarkup: false })
    })

    it('should not build debug markup for a route added after the controllers, while still putting it on the 404 page', async () => {
      // onServerInit runs after the 404 page is set up, and so does frontend reload, which adds its own route
      await startDevApp(30261, {
        onServerInit: app => {
          app.get('router').get('/debugMarkup/addedLater', (req, res) => res.json({ debugMarkup: res.locals.debugMarkup }))
        }
      })
      const port = context.app.get('params').http.port
      const added = await rawGet(port, '/debugMarkup/addedLater')
      assert.strictEqual(added.status, 200)
      assert.deepStrictEqual(JSON.parse(added.body), {}, 'a page that is not an error page should not get debug markup')

      const notFound = await rawGet(port, '/aRouteThatDoesNotExist')
      assert.strictEqual(notFound.status, 404)
      assert.ok(notFound.body.includes('Route list:'), 'the 404 page should still have the debug panel')
      assert.ok(notFound.body.includes('/debugMarkup/addedLater'), 'and list the route added later')
    })

    it('should keep debug markup on the request rather than the app, so each error page shows its own request', async () => {
      await startDevApp(30262, { onBeforeControllers: debugRoutes })
      const port = context.app.get('params').http.port
      const first = await rawGet(port, '/aRouteThatDoesNotExist/first')
      const second = await rawGet(port, '/aRouteThatDoesNotExist/second')
      assert.strictEqual(context.app.get('debugMarkup'), undefined, 'nothing should be kept on the app')
      assert.ok(first.body.includes('/aRouteThatDoesNotExist/first') && !first.body.includes('/aRouteThatDoesNotExist/second'))
      assert.ok(second.body.includes('/aRouteThatDoesNotExist/second') && !second.body.includes('/aRouteThatDoesNotExist/first'))
    })

    it('should escape what it writes into the page, so a url or an error message cannot add markup to it', async () => {
      await startDevApp(30263, { onBeforeControllers: debugRoutes })
      const port = context.app.get('params').http.port

      const notFound = await rawGet(port, '/nothing?x=</script><img/src=x/onerror=alert(1)>$\'$&')
      assert.strictEqual(notFound.status, 404)
      assert.ok(!notFound.body.includes('<img/src=x'), 'the url should not become markup')
      assert.ok(notFound.body.includes('&lt;/script&gt;&lt;img/src=x/onerror=alert(1)&gt;'), 'the url should be shown escaped')
      assert.strictEqual(notFound.body.match(/<\/script>/g).length, 1, 'only the debug script should end a script element')
      assert.ok(notFound.body.trimEnd().endsWith('</html>'), 'special replacement patterns in the url should not rearrange the page')

      const serverError = await rawGet(port, '/debugMarkup/htmlError')
      assert.strictEqual(serverError.status, 500)
      assert.ok(serverError.body.includes('Error message: &lt;b&gt;bold&lt;/b&gt; and &lt;/script&gt;&lt;i&gt;after&lt;/i&gt;'))
      assert.ok(!serverError.body.includes('<i>after</i>'))
      assert.strictEqual(serverError.body.match(/<\/script>/g).length, 1)
    })

    it('should leave credentials and the server\'s internals out of the page', async () => {
      await startDevApp(30264, {
        onBeforeControllers: app => {
          app.set('aSecretSetting', 'app-setting-secret')
          app.use((req, res, next) => {
            res.setHeader('Set-Cookie', 'sid=set-cookie-secret')
            next()
          })
          app.get('/debugMarkup/errorWithProps', (req, res, next) => {
            const err = new Error('an error with properties')
            err.code = 'E_DEBUG_TEST'
            err.detail = 'primitive-detail'
            err.nested = { secret: 'nested-object-secret' }
            next(err)
          })
        },
        onServerStart: app => {
          context.app = app
          app.get('httpServer').aSecretOnTheServer = 'server-property-secret' // where an https server keeps its private key
        }
      })
      const port = context.app.get('params').http.port

      const notFound = await rawGet(port, '/aRouteThatDoesNotExist?visible=query-value', {
        Cookie: 'session=cookie-header-secret',
        Authorization: 'Bearer authorization-header-secret',
        'Proxy-Authorization': 'Basic proxy-authorization-secret',
        'X-Debug-Visible': 'visible-header-value'
      })
      assert.strictEqual(notFound.status, 404)
      for (const secret of ['cookie-header-secret', 'authorization-header-secret', 'proxy-authorization-secret', 'set-cookie-secret', 'server-property-secret', 'app-setting-secret']) {
        assert.ok(!notFound.body.includes(secret), `the page should not include ${secret}`)
      }
      assert.ok(notFound.body.includes('visible-header-value'), 'other request headers should still be shown')
      assert.ok(notFound.body.includes('query-value'), 'the query should still be shown')
      assert.ok(notFound.body.includes('"method":"GET"'), 'the request method should still be shown')

      const serverError = await rawGet(port, '/debugMarkup/errorWithProps')
      assert.strictEqual(serverError.status, 500)
      const err = JSON.parse(serverError.body.match(/const err = (\{.*?\})\n/s)[1])
      assert.strictEqual(err.message, 'an error with properties')
      assert.strictEqual(err.code, 'E_DEBUG_TEST')
      assert.strictEqual(err.detail, 'primitive-detail')
      assert.ok(err.stack.includes('an error with properties'))
      assert.ok(!serverError.body.includes('nested-object-secret'), 'an error\'s object properties should be left out')
    })

    it('should go by the app\'s own mode rather than NODE_ENV, which another app in the same process can change', async () => {
      await startDevApp(30265)
      process.env.NODE_ENV = 'production' // as another app started in the same process would set it
      const notFound = await rawGet(context.app.get('params').http.port, '/aRouteThatDoesNotExist')
      assert.strictEqual(notFound.status, 404)
      assert.ok(notFound.body.includes('Route list:'), 'a development mode app should still show the debug panel')
    })

    it('should put the request and response context on the 404 page', async () => {
      await startDevApp(30105)

      const { data: body } = await get(`http://localhost:${context.app.get('params').http.port}/aRouteThatDoesNotExist`)

      assert.ok(body.includes('const req ='), 'the page should carry the flattened request')
      assert.ok(body.includes('const res ='), 'the page should carry the flattened response')
      assert.ok(body.includes('Route list:'), 'the page should list the routes')
    })

    it('should put the error, request, and response context on the 500 page', async () => {
      await startDevApp(30106)

      const { data: body } = await get(`http://localhost:${context.app.get('params').http.port}/serverError`)

      assert.ok(body.includes('const err ='), 'the page should carry the flattened error')
      assert.ok(body.includes('const req ='), 'the page should carry the flattened request')
      assert.ok(body.includes('This request failed because there was an error in the Express server'), 'the page should explain what happened')
    })

    it('should mark circular references rather than recursing forever', async () => {
      await startDevApp(30107, {
        onBeforeControllers: app => {
          app.get('/debugMarkup/circular', (req, res, next) => {
            const circular = { name: 'circular' }
            circular.self = circular
            res.locals.circular = circular
            next(new Error('circular locals'))
          })
        }
      })

      const { data: body } = await get(`http://localhost:${context.app.get('params').http.port}/debugMarkup/circular`)

      // res.locals can hold anything an app puts there, including a value that points back at itself, so flattening it can only finish by noticing that
      assert.ok(body.includes('[Circular]'), 'a value that points back at something already flattened should be marked rather than followed')
    })

    it('should produce markup a browser can actually parse', async () => {
      await startDevApp(30108)

      const { data: body } = await get(`http://localhost:${context.app.get('params').http.port}/aRouteThatDoesNotExist`)

      // the flattened context is written into a script tag, so it has to be valid json
      const match = body.match(/const req = (\{.*?\})\n/s)
      assert.ok(match, 'the request context should be embedded in the page')
      assert.doesNotThrow(() => JSON.parse(match[1]), 'the embedded context should be valid JSON')
    })
  })
})
