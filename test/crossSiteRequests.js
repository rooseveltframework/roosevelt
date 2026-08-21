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
      }
    })
    await app.initServer()
    startedApps.push(app.expressApp)
    return app.expressApp
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
    it('should block cross-site POSTs when both layers are on', async () => {
      const expressApp = await startApp({ requireTokens: true })

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.status, 403)
    })

    it('should still require a token for a same-origin POST', async () => {
      const expressApp = await startApp({ requireTokens: true })

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'same-origin')

      assert.strictEqual(response.status, 403, 'the token layer should still apply')
    })

    it('should honor the exemptions list, which cross-site callbacks depend on', async () => {
      const expressApp = await startApp({ exemptions: ['/webhook'] })

      const response = await request(expressApp).post('/webhook').set('Sec-Fetch-Site', 'cross-site')

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

      assert.strictEqual(captured.includes('does not set `cookie.sameSite`'), false)
    })

    it('should not warn when a supplied session config sets sameSite to lax', async () => {
      const captured = await captureStartup({ resave: false, saveUninitialized: false, cookie: { sameSite: 'lax' } })

      assert.strictEqual(captured.includes('does not set `cookie.sameSite`'), false)
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

    it('should still block a cross-site POST even though tokens are only a fallback', async () => {
      const expressApp = await startApp(config)

      const response = await request(expressApp).post('/change').set('Sec-Fetch-Site', 'cross-site')

      assert.strictEqual(response.status, 403)
    })
  })
})
