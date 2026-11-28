const { describe, it, after } = require('node:test')
const captureLogs = require('./util/captureLogs')
const closeSessionStores = require('./util/closeSessionStores')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('cross-site request blocking', () => {
  const appDir = path.join(__dirname, 'app/crossSite')

  // every app here opens the same sqlite file, and windows will not let the folder go while any of them still holds it
  const startedApps = []

  // spins up an app with a POST route, under whatever csrf config is being exercised
  async function startApp (csrfProtection, expressSession = true, showWarnings = false) {
    fs.ensureDirSync(appDir)
    const app = roosevelt({
      appDir,
      makeBuildArtifacts: false,
      htmlValidator: { enable: false },
      http: { enable: false },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: showWarnings, error: false, verbose: false } },
      expressSession,
      csrfProtection,
      expressSessionStore: { filename: path.join(appDir, 'crossSite.sqlite') },
      onServerInit: expressApp => {
        const router = expressApp.get('router')
        router.post('/change', (req, res) => res.send('changed'))
        router.post('/webhook', (req, res) => res.send('hooked'))
        router.get('/read', (req, res) => res.send('read'))
        router.get('/token', (req, res) => res.json({ csrfToken: req.csrfToken() }))
      }
    })
    await app.initServer()
    startedApps.push(app.expressApp)
    return app.expressApp
  }

  // a token and the session cookie it belongs to, since supertest does not keep cookies across requests
  async function getTokenAndCookie (expressApp) {
    const response = await request(expressApp).get('/token').set('Sec-Fetch-Site', 'same-origin')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(typeof response.body.csrfToken, 'string')
    return { csrfToken: response.body.csrfToken, cookie: response.headers['set-cookie'] }
  }

  after(() => {
    closeSessionStores(startedApps)
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('with tokens disabled', () => {
    const config = { requireTokens: false }

    it('should block a POST the browser reports as coming from another site', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.status, 403)
    })

    it('should allow a POST from the same origin', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.text, 'changed')
    })

    it('should allow a POST the browser reports as same-site', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-site')

      assert.strictEqual(response.text, 'changed')
    })

    it('should reject a POST with no Sec-Fetch-Site header', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change')

      assert.strictEqual(response.status, 403, 'a request that cannot prove where it came from is refused')
    })

    it('should not block cross-site GET requests', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).get('/read').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.text, 'read')
    })

    it('should not require a token when requireTokens is off', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.status, 200, 'a same-origin POST should not need a csrf token')
    })
  })

  describe('alongside the token layer', () => {
    // when tokens are always required, the cross-site layer leaves the decision to the token layer, so a cross-site POST is refused for having no token
    it('should refuse a cross-site POST without a token when tokens are always required', async () => {
      const expressApp = await startApp({ requireTokens: true })

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.status, 403)
    })

    it('should leave a cross-site POST to the token layer when tokens are always required', async () => {
      const expressApp = await startApp({ requireTokens: true })
      const { csrfToken, cookie } = await getTokenAndCookie(expressApp)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site').set('X-CSRF-TOKEN', csrfToken).set('Cookie', cookie)

      assert.strictEqual(response.text, 'changed', 'a valid token is what decides when tokens are always required')
    })

    it('should block a cross-site POST in the cross-site layer even with a valid token when tokens are only a fallback', async () => {
      const expressApp = await startApp({ requireTokens: 'whenHeaderMissing' })
      const { csrfToken, cookie } = await getTokenAndCookie(expressApp)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site').set('X-CSRF-TOKEN', csrfToken).set('Cookie', cookie)

      assert.strictEqual(response.status, 403, 'the cross-site layer should refuse it before the token is looked at')
    })

    it('should still require a token for a same-origin POST', async () => {
      const expressApp = await startApp({ requireTokens: true })

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.status, 403, 'the token layer should still apply')
    })

    it('should allow a same-origin POST that carries a valid token', async () => {
      const expressApp = await startApp({ requireTokens: true })
      const { csrfToken, cookie } = await getTokenAndCookie(expressApp)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin').set('X-CSRF-TOKEN', csrfToken).set('Cookie', cookie)

      assert.strictEqual(response.text, 'changed')
    })

    it('should honor the exemptions list, which cross-site callbacks depend on', async () => {
      const expressApp = await startApp({ exemptions: ['/webhook'] })

      const response = await request(expressApp).post('/webhook').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.text, 'hooked')
    })

    it('should honor the exemptions list when the request has a query string', async () => {
      const expressApp = await startApp({ exemptions: ['/webhook'] })

      const response = await request(expressApp).post('/webhook?sig=1').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.text, 'hooked')
    })

    it('should honor the exemptions list in the token layer when the request has a query string', async () => {
      const expressApp = await startApp({ requireTokens: true, exemptions: ['/webhook'] })

      const response = await request(expressApp).post('/webhook?sig=1')

      assert.strictEqual(response.text, 'hooked')
    })
  })

  describe('when switched off', () => {
    it('should allow cross-site POSTs when blockCrossSiteRequests is false', async () => {
      const expressApp = await startApp({ requireTokens: false, blockCrossSiteRequests: false })

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.text, 'changed')
    })

    it('should allow cross-site POSTs when csrfProtection is off entirely', async () => {
      const expressApp = await startApp(false)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.text, 'changed')
    })
  })

  describe('sameSite warning', () => {
    // captures what roosevelt logs during startup
    async function captureStartup (expressSession) {
      let captured = ''
      captureLogs.start()
      try {
        await startApp(true, expressSession, true)
      } finally {
        captured = captureLogs.stop()
      }
      return captured
    }

    it('should warn when a supplied session config leaves sameSite unset', async () => {
      const captured = await captureStartup({ resave: false, saveUninitialized: false, cookie: {} })

      assert.ok(captured.includes('sameSite'), `expected a sameSite warning, got: ${JSON.stringify(captured.slice(0, 400))}`)
    })

    it('should not warn when a supplied session config sets sameSite to strict', async () => {
      const captured = await captureStartup({ resave: false, saveUninitialized: false, cookie: { sameSite: 'strict' } })

      assert.doesNotMatch(captured, /sameSite/)
    })

    it('should not warn when a supplied session config sets sameSite to lax', async () => {
      const captured = await captureStartup({ resave: false, saveUninitialized: false, cookie: { sameSite: 'lax' } })

      assert.doesNotMatch(captured, /sameSite/)
    })

    it('should warn when a supplied session config sets sameSite to none', async () => {
      const captured = await captureStartup({ resave: false, saveUninitialized: false, cookie: { sameSite: 'none' } })

      assert.ok(captured.includes('sameSite'), 'sameSite=none gives up the protection, so it should warn')
    })
  })

  describe('trusted origins', () => {
    const config = { trustedOrigins: ['https://payments.example.com'] }

    it('should allow a cross-site POST from a trusted origin', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp)
        .post('/change')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://payments.example.com')

      assert.strictEqual(response.text, 'changed')
    })

    it('should still block a cross-site POST from any other origin', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp)
        .post('/change')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://not-invited.example.com')

      assert.strictEqual(response.status, 403)
    })
  })

  describe('token fallback for older browsers', () => {
    const config = { requireTokens: 'whenHeaderMissing' }

    it('should allow a same-origin POST without a token, since the header vouched for it', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.text, 'changed')
    })

    it('should require a token when the header is missing rather than refusing outright', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change')

      assert.strictEqual(response.status, 403, 'no header and no token is refused')
    })

    it('should allow a POST without the header that carries a valid token', async () => {
      const expressApp = await startApp(config)
      const { csrfToken, cookie } = await getTokenAndCookie(expressApp)

      const response = await request(expressApp).post('/change').set('X-CSRF-TOKEN', csrfToken).set('Cookie', cookie)

      assert.strictEqual(response.text, 'changed', 'an older browser with a token should get through')
    })

    it('should make req.csrfToken() available to a page requested by a browser that sends the header', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).get('/token').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.status, 200)
      assert.strictEqual(typeof response.body.csrfToken, 'string')
    })

    it('should still block a cross-site POST even though tokens are only a fallback', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.status, 403)
    })

    describe('with blockCrossSiteRequests off', () => {
      const config = { requireTokens: 'whenHeaderMissing', blockCrossSiteRequests: false }

      it('should require a token from a cross-site POST, since nothing else would stop it', async () => {
        const expressApp = await startApp(config)

        const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

        assert.strictEqual(response.status, 403)
      })

      it('should allow a cross-site POST that carries a valid token', async () => {
        const expressApp = await startApp(config)
        const { csrfToken, cookie } = await getTokenAndCookie(expressApp)

        const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site').set('X-CSRF-TOKEN', csrfToken).set('Cookie', cookie)

        assert.strictEqual(response.text, 'changed')
      })

      it('should still trust the header for a same-origin POST', async () => {
        const expressApp = await startApp(config)

        const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

        assert.strictEqual(response.text, 'changed')
      })
    })
  })
})
