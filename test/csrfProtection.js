const { describe, it, before, after } = require('node:test')

const axios = require('axios')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const express = require('express')
const assert = require('assert')
const { rmSync } = require('fs')
const path = require('path')
const closeSessionStores = require('./util/closeSessionStores')

// build artifacts are written here rather than to the test directory itself, since roosevelt otherwise defaults appDir to the directory of the requiring module
const appDir = path.join(__dirname, 'app/csrfProtection')

// a page that hands out a token, and the session cookie that token belongs to, since supertest does not keep cookies across requests
async function getTokenAndCookie (app) {
  const res = await request(app).get('/').expect(200)
  const csrfToken = res.body.csrfToken
  assert.strictEqual(typeof csrfToken, 'string', 'the page should hand out a token')
  assert.ok(csrfToken.length > 0, 'the token should not be empty')
  const cookie = res.headers['set-cookie']
  assert.ok(cookie, 'the page should start a session')
  return { csrfToken, cookie }
}

describe('CSRF', () => {
  // every app in this file opens the same sqlite file, and windows will not remove the folder while any of them still holds it
  const startedApps = []

  // wipe out the test app directory even if a test or hook fails partway through
  after(() => {
    closeSessionStores(startedApps)
    rmSync(appDir, { recursive: true, force: true })
  })

  describe('CSRF protection enabled', () => {
    // open up testing context
    const context = {}

    before(async () => {
      const app = express()
      app.post('/attack', async (req, res) => {
        try {
          await axios.post(`http://localhost:${context.app.get('params').http.port}/protected`)
          res.sendStatus(200)
        } catch (err) {
          res.sendStatus(err.response?.status || 500)
        }
      })
      context.attackingApp = app

      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        appDir,
        csrfProtection: { requireTokens: true },
        expressSession: true,
        expressSessionStore: {
          filename: path.join(appDir, 'secrets/test-sessions.sqlite')
        },
        makeBuildArtifacts: true,
        http: {
          port: 30101
        },
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        htmlValidator: {
          enable: true
        },
        frontendReload: {
          enable: false
        },
        onServerInit: app => {
          const router = app.get('router')
          router.get('/', (req, res) => {
            res.json({ csrfToken: req.csrfToken() })
          })
          router.post('/protected', (req, res) => {
            res.json({ message: 'protected' })
          })
          router.post('/upload', (req, res) => {
            res.json({ files: Object.keys(req.files || {}) })
          })
        }
      })

      await rooseveltApp.startServer()

      context.app = rooseveltApp.expressApp
      startedApps.push(rooseveltApp.expressApp)
      context.instance = rooseveltApp
    })

    after(async () => {
      // the server goes down first, then the session store lets go of its sqlite file, because windows will not remove a folder while anything still holds a file inside it
      await context.instance.stopServer({ persistProcess: true })
      closeSessionStores(context.app)
      rmSync(appDir, { recursive: true, force: true })
    })

    it('should reject CSRF attacks', async () => {
      // a route on the attacking app that makes a POST against the CSRF app, and answers with whatever status that POST got
      const res = await request(context.attackingApp).post('/attack')

      assert.strictEqual(res.status, 403)
    })

    it('should allow a POST from a valid request', async () => {
      const { csrfToken, cookie } = await getTokenAndCookie(context.app)

      const res = await request(context.app)
        .post('/protected')
        .set('X-CSRF-TOKEN', csrfToken)
        .set('Cookie', cookie)
        .expect(200)

      assert.deepStrictEqual(res.body, { message: 'protected' })
    })

    it('should not allow a POST with the wrong token for its session', async () => {
      // the session is real, so the 403 below can only come from the token being wrong rather than from there being no session to check it against
      const { csrfToken, cookie } = await getTokenAndCookie(context.app)

      const res = await request(context.app)
        .post('/protected')
        .set('X-CSRF-TOKEN', 'not-the-token')
        .set('Cookie', cookie)
        .expect(403)
      assert.notDeepStrictEqual(res.body, { message: 'protected' })

      // and the same session with its own token gets through, which shows the session was usable all along
      await request(context.app)
        .post('/protected')
        .set('X-CSRF-TOKEN', csrfToken)
        .set('Cookie', cookie)
        .expect(200)
    })

    it('should not allow a POST with no session at all', async () => {
      const { csrfToken } = await getTokenAndCookie(context.app)

      await request(context.app)
        .post('/protected')
        .set('X-CSRF-TOKEN', csrfToken)
        .expect(403)
    })

    it('should accept a token sent as the _csrf field of a multipart form', async () => {
      const { csrfToken, cookie } = await getTokenAndCookie(context.app)

      const res = await request(context.app)
        .post('/upload')
        .set('Cookie', cookie)
        .field('_csrf', csrfToken)
        .attach('upload', Buffer.from('some file'), { filename: 'upload.txt' })
        .expect(200)

      assert.deepStrictEqual(res.body, { files: ['upload'] })
    })

    it('should reject the wrong token sent as the _csrf field of a multipart form', async () => {
      const { cookie } = await getTokenAndCookie(context.app)

      await request(context.app)
        .post('/upload')
        .set('Cookie', cookie)
        .field('_csrf', 'not-the-token')
        .attach('upload', Buffer.from('some file'), { filename: 'upload.txt' })
        .expect(403)
    })
  })

  describe('CSRF protection disabled', () => {
    // open up testing context
    const context = {}

    before(async () => {
      const app = express()

      app.post('/attack', async (req, res) => {
        try {
          await axios.post(`http://localhost:${context.app.get('params').http.port}/unprotected`)
          res.sendStatus(200)
        } catch (err) {
          res.sendStatus(err.response?.status || 500)
        }
      })

      context.attackingApp = app

      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        appDir,
        csrfProtection: false,
        expressSession: false,
        makeBuildArtifacts: false,
        http: {
          port: 30102
        },
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        htmlValidator: {
          enable: true
        },
        frontendReload: {
          enable: false
        },
        onServerInit: app => {
          const router = app.get('router')

          router.post('/unprotected', (req, res) => {
            res.send('this is unprotected')
          })
          router.post('/upload', (req, res) => {
            res.json({ files: Object.keys(req.files || {}) })
          })
        }
      })

      await rooseveltApp.startServer()

      // bind app to test context
      context.app = rooseveltApp.expressApp
      context.instance = rooseveltApp
      startedApps.push(rooseveltApp.expressApp)
    })

    after(async () => {
      // stop the server, then let go of the sqlite file so the folder can be removed on windows too
      await context.instance.stopServer({ persistProcess: true })
      closeSessionStores(context.app)
    })

    it('should allow a CSRF attack', async () => {
      await request(context.attackingApp).post('/attack').expect(200)
    })

    it('should allow a POST without a CSRF token', async () => {
      await request(context.app).post('/unprotected').expect(200)
    })

    it('should still parse multipart forms', async () => {
      const res = await request(context.app)
        .post('/upload')
        .attach('upload', Buffer.from('some file'), { filename: 'upload.txt' })
        .expect(200)

      assert.deepStrictEqual(res.body, { files: ['upload'] })
    })
  })

  describe('CSRF exempted routes', () => {
    // open up testing context
    const context = {}

    before(async () => {
      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        appDir,
        csrfProtection: {
          requireTokens: true,
          exemptions: ['/test', '/test/*', '/*-example']
        },
        expressSession: true,
        expressSessionStore: {
          filename: path.join(appDir, 'secrets/test-sessions.sqlite')
        },
        makeBuildArtifacts: true,
        http: {
          port: 30103
        },
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        htmlValidator: {
          enable: true
        },
        frontendReload: {
          enable: false
        },
        onServerInit: app => {
          const router = app.get('router')
          router.get('/', (req, res) => {
            const csrfToken = req.csrfToken()
            res.json({ csrfToken })
          })

          router.post('/protected', (req, res) => {
            res.send('protected')
          })

          router.post('/test', (req, res) => {
            res.send('/test response')
          })

          router.post('/test/foo', (req, res) => {
            res.send('/test/foo response')
          })

          router.post('/some-example', (req, res) => {
            res.send('/some-example response')
          })

          router.post('/another-example', (req, res) => {
            res.send('/another-example response')
          })
        }
      })

      await rooseveltApp.startServer()

      context.app = rooseveltApp.expressApp
      startedApps.push(rooseveltApp.expressApp)
      context.instance = rooseveltApp
    })

    after(async () => {
      // the server goes down first, then the session store lets go of its sqlite file, because windows will not remove a folder while anything still holds a file inside it
      await context.instance.stopServer({ persistProcess: true })
      closeSessionStores(context.app)
      rmSync(appDir, { recursive: true, force: true })
    })

    it('should not require a token on exempted routes', async () => {
      // test the '/test' exemption
      let res = await request(context.app).post('/test').expect(200)
      assert.strictEqual(res.text, '/test response')

      // test the 'test/*' exemption
      res = await request(context.app).post('/test/foo').expect(200)
      assert.strictEqual(res.text, '/test/foo response')
    })

    it('should not require a token on exempted routes with the glob format', async () => {
      // test the '*-example' exemption
      let res = await request(context.app).post('/some-example').expect(200)
      assert.strictEqual(res.text, '/some-example response')

      // try the '*-example' exemption on a different route
      res = await request(context.app).post('/another-example').expect(200)
      assert.strictEqual(res.text, '/another-example response')
    })

    it('should not require a token on an exempted route called with a query string', async () => {
      // callers such as webhooks often add a signature or the like to the url, which should not stop the route from matching its exemption
      let res = await request(context.app).post('/test?sig=1').expect(200)
      assert.strictEqual(res.text, '/test response')

      res = await request(context.app).post('/test/foo?sig=1&other=2').expect(200)
      assert.strictEqual(res.text, '/test/foo response')
    })

    it('should not let a query string make a protected route look exempted', async () => {
      await request(context.app).post('/protected?/test').expect(403)
    })

    it('should still protect routes not included in the exemptions', async () => {
      // first we attempt to post without the token
      await request(context.app).post('/protected').expect(403)

      // then we get the token and attach it to headers to make a valid request
      const { csrfToken, cookie } = await getTokenAndCookie(context.app)

      const res = await request(context.app)
        .post('/protected')
        .set('X-CSRF-TOKEN', csrfToken)
        .set('Cookie', cookie)
        .expect(200)
      assert.strictEqual(res.text, 'protected')
    })
  })
})
