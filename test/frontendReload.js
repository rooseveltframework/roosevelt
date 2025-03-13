/* eslint-env mocha */

const path = require('path')
const assert = require('assert')
const fs = require('fs-extra')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const generateTestCerts = require('./util/generateTestCerts')

describe('frontend reload', () => {
  const appDir = path.join(__dirname, 'app/frontendReload')

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
    mode: 'development',
    makeBuildArtifacts: false,
    htmlValidator: {
      enable: false
    },
    frontendReload: {
      enable: true
    }
  }

  // configure and start roosevelt, returning instance of the app
  async function startRoosevelt (config) {
    const app = roosevelt({
      ...config
    })
    await app.startServer()
    return app.expressApp
  }

  // stop roosevelt server
  async function killRoosevelt (app, proto) {
    return new Promise(resolve => {
      if (proto === 'HTTP') {
        app.get('httpServer').close(() => {
          resolve()
        })
      } else {
        app.get('httpsServer').close(() => {
          resolve()
        })
      }
    })
  }

  before(() => {
    generateTestCerts(config.appDir, 'secrets')
  })

  after(async () => {
    await fs.remove(config.appDir)
  })

  it('should start reload http server in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt(config)

    // check that reload js is being served
    const res = await request(app)
      .get('/express-browser-reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 200)
  })

  it('should auto inject reload script into rendered html', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config
    })

    // check that reload script is injected into response bodies
    const res = await request(app)
      .get('/script')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.text.includes('<script src="/express-browser-reload.js"></script>'))
  })

  it('should not start reload in prod mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      mode: 'production'
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/express-browser-reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
  })

  it('should exclude multiple glob paths for auto inject reload script into rendered html', async () => {
    // configure and start roosevelt

    const app = await startRoosevelt({
      ...config,
      frontendReload: {
        ...config.frontendReload,
        exceptionRoutes: [
          '/HTMLTest/*',
          '/HTMLTest2'
        ]
      }
    })

    // check that reload script is injected into response bodies
    const res1 = await request(app)
      .get('/HTMLTest/nested')

    const res2 = await request(app)
      .get('/HTMLTest2')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    assert(!res1.text.includes('<script src="/express-browser-reload.js"></script>'))
    assert(!res2.text.includes('<script src="/express-browser-reload.js"></script>'))
  })

  it('should not start reload in prod mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      mode: 'production'
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/express-browser-reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
  })

  it('should not start reload when disabled', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      frontendReload: {
        enable: false
      }
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/express-browser-reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
  })
})
