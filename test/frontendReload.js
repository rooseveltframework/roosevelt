const { describe, it, after } = require('node:test')

const path = require('path')
const assert = require('assert')
const fs = require('fs-extra')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('frontend reload', () => {
  const appDir = path.join(__dirname, 'app/frontendReload')
  const reloadScript = '<script src="/express-browser-reload.js"></script>'

  // common configuration
  const config = {
    appDir,
    logging: {
      methods: {
        info: false,
        http: false,
        warn: false,
        error: false
      }
    },
    csrfProtection: false,
    expressSession: false,
    mode: 'development',
    makeBuildArtifacts: false,
    htmlValidator: {
      enable: false
    },
    frontendReload: {
      enable: true
    },

    // html pages for the script to be injected into, which are not the 404 page
    onServerInit: app => {
      const page = (req, res) => res.send(`<!DOCTYPE html><html lang="en"><head><title>page</title></head><body><p>${req.path}</p></body></html>`)
      const router = app.get('router')
      router.get('/HTMLTest/nested', page)
      router.get('/HTMLTest2', page)
      router.get('/included', page)
    }
  }

  // configure and start roosevelt, then run the test against it, stopping it afterwards however the test went
  async function withRoosevelt (config, test) {
    const app = roosevelt({
      http: { port: 30109 },
      ...config
    })
    await app.startServer()
    try {
      await test(app.expressApp)
    } finally {
      await app.stopServer({ persistProcess: true })
    }
  }

  after(async () => {
    await fs.remove(config.appDir)
  })

  it('should start reload http server in dev mode', async () => {
    await withRoosevelt(config, async app => {
      // check that reload js is being served
      const res = await request(app).get('/express-browser-reload.js')
      assert.strictEqual(res.status, 200)
    })
  })

  it('should auto inject reload script into rendered html', async () => {
    await withRoosevelt(config, async app => {
      // check that reload script is injected into response bodies
      const res = await request(app).get('/included')
      assert.strictEqual(res.status, 200)
      assert.ok(res.text.includes(reloadScript))
    })
  })

  it('should not start reload in prod mode', async () => {
    await withRoosevelt({ ...config, mode: 'production' }, async app => {
      // check that reload js is not being served
      const res = await request(app).get('/express-browser-reload.js')
      assert.strictEqual(res.status, 404)
    })
  })

  it('should exclude multiple glob paths for auto inject reload script into rendered html', async () => {
    await withRoosevelt({
      ...config,
      frontendReload: {
        ...config.frontendReload,
        exceptionRoutes: [
          '/HTMLTest/*',
          '/HTMLTest2'
        ]
      }
    }, async app => {
      const res1 = await request(app).get('/HTMLTest/nested')
      const res2 = await request(app).get('/HTMLTest2?with=query')
      const res3 = await request(app).get('/included')

      assert.strictEqual(res1.status, 200)
      assert.strictEqual(res2.status, 200)
      assert.ok(!res1.text.includes(reloadScript), 'a route matching a glob should be excluded')
      assert.ok(!res2.text.includes(reloadScript), 'a route should be excluded whatever its query string')
      assert.ok(res3.text.includes(reloadScript), 'a route in neither entry should still get the script')
    })
  })

  it('should exclude nothing when exceptionRoutes is not a list', async () => {
    await withRoosevelt({
      ...config,
      frontendReload: {
        ...config.frontendReload,
        exceptionRoutes: null
      }
    }, async app => {
      const res = await request(app).get('/included')
      assert.ok(res.text.includes(reloadScript))
    })
  })

  it('should ask for the reload script under the route prefix, where its route is', async () => {
    await withRoosevelt({
      ...config,
      routePrefix: '/prefix',
      frontendReload: {
        ...config.frontendReload,
        exceptionRoutes: ['/prefix/HTMLTest2']
      }
    }, async app => {
      const page = await request(app).get('/prefix/included')
      assert.strictEqual(page.status, 200)
      assert.ok(page.text.includes('<script src="/prefix/express-browser-reload.js"></script>'), 'the injected script should point at the prefixed route')

      const script = await request(app).get('/prefix/express-browser-reload.js')
      assert.strictEqual(script.status, 200, 'the script should be served where the page asks for it')

      // the exceptions are matched against the path the browser asked for, prefix and all, even though the page is sent from the router mounted at the prefix
      const excluded = await request(app).get('/prefix/HTMLTest2')
      assert.strictEqual(excluded.status, 200)
      assert.ok(!excluded.text.includes('express-browser-reload.js'))
    })
  })

  it('should not start reload when disabled', async () => {
    await withRoosevelt({
      ...config,
      frontendReload: {
        enable: false
      }
    }, async app => {
      // check that reload js is not being served
      const res = await request(app).get('/express-browser-reload.js')
      assert.strictEqual(res.status, 404)
    })
  })
})
