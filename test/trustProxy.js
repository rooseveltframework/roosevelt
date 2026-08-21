const { describe, it, beforeEach, afterEach } = require('node:test')

const assert = require('assert')
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const captureLogs = require('./util/captureLogs')

describe('trusting a proxy', () => {
  const appDir = path.join(__dirname, 'app/trustProxy')
  const context = {}

  beforeEach(() => {
    delete process.env.NODE_ENV // roosevelt writes this, and it outranks the mode param on the next app built in this process
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  afterEach(async () => {
    if (context.proxy) await new Promise(resolve => context.proxy.close(resolve))
    if (context.app) await new Promise(resolve => context.app.get('httpServer').close(resolve))
    context.proxy = null
    context.app = null
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  function params (options = {}) {
    return roosevelt({
      appDir,
      makeBuildArtifacts: false,
      csrfProtection: false,
      logging: { methods: { http: false, info: false, warn: false } },
      ...options
    }).expressApp.get('params')
  }

  // stands in for a web server that terminates https and forwards on, the way apache and nginx are usually set up
  // it appends to any forwarded address the visitor already sent rather than replacing it, which is what the common nginx directive does
  async function startAppBehindProxy (options, forwardedProto = 'https') {
    const appPort = 30330
    const proxyPort = 30331

    const rooseveltApp = roosevelt({
      appDir,
      mode: 'production-proxy',
      makeBuildArtifacts: false,
      csrfProtection: false,
      expressSession: false,
      https: { enable: false },
      http: { port: appPort },
      localhostOnly: false,
      logging: { methods: { http: false, info: false, warn: false } },
      ...options,
      onServerInit: app => {
        app.get('router').route('/whoami').get((req, res) => res.json({ ip: req.ip, protocol: req.protocol, secure: req.secure }))
        // roosevelt does not save a session that was never written to, so this route gives it something to remember
        app.get('router').route('/signin').get((req, res) => { req.session.signedIn = true; res.send('ok') })
      }
    })
    await rooseveltApp.startServer()
    context.app = rooseveltApp.expressApp

    context.proxy = http.createServer((clientReq, clientRes) => {
      const forwarded = clientReq.headers['x-forwarded-for']
      http.request({
        host: 'localhost',
        port: appPort,
        path: clientReq.url,
        headers: {
          ...clientReq.headers,
          'x-forwarded-for': forwarded ? `${forwarded}, 198.51.100.7` : '198.51.100.7',
          'x-forwarded-proto': forwardedProto
        }
      }, r => { clientRes.writeHead(r.statusCode, r.headers); r.pipe(clientRes) }).end()
    })
    await new Promise(resolve => context.proxy.listen(proxyPort, resolve))

    return headers => new Promise(resolve => http.get({ host: 'localhost', port: proxyPort, path: '/whoami', headers }, r => {
      let body = ''
      r.on('data', chunk => { body += chunk })
      r.on('end', () => resolve(JSON.parse(body)))
    }))
  }

  async function startAppBehindProxyWithSessions (options = {}, forwardedProto = 'https') {
    await startAppBehindProxy({ expressSession: true, ...options }, forwardedProto)
    return async () => {
      const res = await new Promise(resolve => http.get({ host: 'localhost', port: 30331, path: '/signin' }, resolve))
      res.resume()
      return (res.headers['set-cookie'] || [])[0]
    }
  }

  describe('choosing a default', () => {
    it('should believe a proxy in production-proxy mode, since that mode says one is there', () => {
      assert.strictEqual(params({ mode: 'production-proxy' }).trustProxy, 1)
    })

    it('should not believe a proxy in production mode, where nothing promises one is there', () => {
      assert.strictEqual(params({ mode: 'production' }).trustProxy, false)
    })

    it('should not believe a proxy in development mode', () => {
      assert.strictEqual(params({ mode: 'development', htmlValidator: { enable: false } }).trustProxy, false)
    })

    it('should let the app say how many proxies are in front of it', () => {
      assert.strictEqual(params({ mode: 'production-proxy', trustProxy: 2 }).trustProxy, 2)
    })

    it('should let the app switch it off even in production-proxy mode', () => {
      assert.strictEqual(params({ mode: 'production-proxy', trustProxy: false }).trustProxy, false)
    })

    it('should let the app switch it on in a mode that does not do so by default', () => {
      assert.strictEqual(params({ mode: 'production', trustProxy: 1 }).trustProxy, 1)
    })
  })

  describe('behind a proxy', () => {
    it('should report the visitor rather than the proxy, and see the request as secure', async () => {
      const ask = await startAppBehindProxy({})

      assert.deepStrictEqual(await ask({}), { ip: '198.51.100.7', protocol: 'https', secure: true })
    })

    it('should ignore an address the visitor made up', async () => {
      const ask = await startAppBehindProxy({})

      // the proxy appends its own view of who called, so a made up value ends up to the left of the real one
      const seen = await ask({ 'x-forwarded-for': '1.2.3.4' })

      assert.strictEqual(seen.ip, '198.51.100.7', 'counting back from the connection lands on what the proxy said, not what the visitor claimed')
    })

    it('should report the proxy itself when told not to believe it', async () => {
      const ask = await startAppBehindProxy({ trustProxy: false })

      const seen = await ask({})

      // the proxy reaches the app over loopback, which resolves to 127.0.0.1 on some systems and ::1 on others, so the family is not the point
      assert.notStrictEqual(seen.ip, '198.51.100.7', 'the app should not be reporting the address the proxy forwarded')
      assert.ok(/^(::1|(::ffff:)?127(\.\d+){3})$/.test(seen.ip), `without trusting the proxy the app only sees the connection it received, got: ${seen.ip}`)
      assert.strictEqual(seen.secure, false, 'and it cannot tell that the visitor used https')
    })
  })

  describe('session cookies', () => {
    it('should mark the session cookie https only, even though the app itself speaks plain http', async () => {
      // the app terminates nothing: the proxy handles https and forwards plain http, so express only learns the visitor used https from the proxy
      const ask = await startAppBehindProxyWithSessions()

      const cookie = await ask()

      assert.ok(cookie, 'a session cookie should have been set')
      assert.ok(/;\s*Secure/i.test(cookie), `the cookie should be marked Secure, got: ${cookie}`)
      assert.ok(/;\s*HttpOnly/i.test(cookie), 'and it should stay out of reach of page scripts')
    })

    it('should still sign people in behind a web server that speaks plain http', async () => {
      // an app with no encryption anywhere is a real deployment, and roosevelt deciding the flag once at startup used to leave it handing out no cookie at all, so nobody could stay signed in and nothing said why
      const ask = await startAppBehindProxyWithSessions({}, 'http')

      const cookie = await ask()

      assert.ok(cookie, 'a session cookie should still be set')
      assert.ok(!/;\s*Secure/i.test(cookie), `and it should not claim to be https only, got: ${cookie}`)
    })

    it('should say so when it hands out a cookie that is not https only', async () => {
      captureLogs.start()
      let captured = ''
      try {
        const ask = await startAppBehindProxyWithSessions({ logging: { methods: { http: false, info: false } } }, 'http')
        await ask()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('not marked HTTPS only'), `roosevelt should warn, got: ${captured.slice(0, 300)}`)
      assert.ok(captured.includes('X-Forwarded-Proto'), 'and should name the header a misconfigured web server is usually missing')
    })

    it('should stay quiet when the cookie is https only', async () => {
      captureLogs.start()
      let captured = ''
      try {
        const ask = await startAppBehindProxyWithSessions({ logging: { methods: { http: false, info: false } } })
        await ask()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(!captured.includes('not marked HTTPS only'), `nothing is wrong here, got: ${captured.slice(0, 300)}`)
    })

    it('should not mark the cookie https only when the proxy is not trusted, since it cannot tell the visitor used https', async () => {
      // telling express there is no proxy leaves it reading the connection it can see, which is the plain http hop from the web server
      const ask = await startAppBehindProxyWithSessions({ trustProxy: false })

      const cookie = await ask()

      assert.ok(cookie, 'a session cookie should still be set rather than silently withheld')
      assert.ok(!/;\s*Secure/i.test(cookie), `express cannot tell the visitor used https, got: ${cookie}`)
    })
  })
})
