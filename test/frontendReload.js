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
      .get('/reloadHttp/reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')
    await app.get('reloadHttpServer').closeServer()

    // assertion last because mocha
    assert(res.status === 200)
  })

  it('should start reload https server in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      https: {
        enable: true,
        port: 43712,
        force: true,
        autoCert: true,
        authInfoPath: {
          authCertAndKey: {
            cert: 'cert.pem',
            key: 'key.pem'
          }
        },
        passphrase: 'testpass'
      }
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/reloadHttps/reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTPS')
    await app.get('reloadHttpsServer').closeServer()

    // assertion last because mocha
    assert(res.status === 200)
  })

  it('should start reload http and https servers in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      https: {
        enable: true,
        port: 43712,
        force: false,
        autoCert: true,
        authInfoPath: {
          authCertAndKey: {
            cert: 'cert.pem',
            key: 'key.pem'
          }
        },
        passphrase: 'testpass'
      }
    })

    // check that reload js is being served
    const httpRes = await request(app)
      .get('/reloadHttp/reload.js')

    const httpsRes = await request(app)
      .get('/reloadHttps/reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')
    await killRoosevelt(app, 'HTTPS')
    await app.get('reloadHttpServer').closeServer()
    await app.get('reloadHttpsServer').closeServer()

    // assertion last because mocha
    assert(httpRes.status === 200)
    assert(httpsRes.status === 200)
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
    await app.get('reloadHttpServer').closeServer()

    // assertion last because mocha
    assert(res.text.includes('<script src=\'/reloadHttp/reload.js\'></script>'))
  })

  it('should not start reload in prod mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      mode: 'production'
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/reloadHttp/reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
    assert(app.get('reloadHttpServer') === undefined)
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
      .get('/reloadHttp/reload.js')

    // shut down the roosevelt server
    await killRoosevelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
    assert(app.get('reloadHttpServer') === undefined)
  })
})
