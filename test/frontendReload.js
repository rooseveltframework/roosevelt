/* eslint-env mocha */

const assert = require('assert')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('frontend reload', () => {
  // common configuration
  const config = {
    logging: {
      methods: {
        info: false,
        http: false,
        warn: false,
        error: false
      }
    },
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
    return new Promise((resolve) => {
      roosevelt({
        ...config,
        onServerStart: app => {
          resolve(app)
        }
      }).startServer()
    })
  }

  // stop roosevelt server
  async function killRoosvelt (app, proto) {
    return new Promise(resolve => {
      if (proto === 'HTTP') {
        app.httpServer.close(() => {
          resolve()
        })
      } else {
        app.httpsServer.close(() => {
          resolve()
        })
      }
    })
  }

  it('should start reload http server in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/reloadHttp/reload.js')

    // shut down the roosevelt server
    await killRoosvelt(app, 'HTTP')
    await app.get('reloadHttpServer').closeServer()

    // assertion last because mocha
    assert(res.status === 200)
  })

  it.skip('should start reload https server in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      https: {
        enable: true,
        port: 43712,
        force: true,
        autoCert: false,
        authInfoPath: {
          p12: {
            p12Path: 'certs/cert.p12'
          },
          authCertAndKey: {
            cert: 'certs/cert.pem',
            key: 'certs/key.pem'
          }
        },
        passphrase: 'testpass'
      }
    })

    // check that reload js is being served
    const res = await request(app)
      .get('/reloadHttps/reload.js')

    // shut down the roosevelt server
    await killRoosvelt(app, 'HTTPS')
    await app.get('reloadHttpsServer').closeServer()

    // assertion last because mocha
    assert(res.status === 200)
  })

  it.skip('should start reload http and https servers in dev mode', async () => {
    // configure and start roosevelt
    const app = await startRoosevelt({
      ...config,
      https: {
        enable: true,
        port: 43712,
        force: false,
        autoCert: false,
        authInfoPath: {
          p12: {
            p12Path: 'certs/cert.p12'
          },
          authCertAndKey: {
            cert: 'certs/cert.pem',
            key: 'certs/key.pem'
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
    await killRoosvelt(app, 'HTTP')
    await killRoosvelt(app, 'HTTPS')
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
    await killRoosvelt(app, 'HTTP')
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
    await killRoosvelt(app, 'HTTP')

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
    await killRoosvelt(app, 'HTTP')

    // assertion last because mocha
    assert(res.status === 404)
    assert(app.get('reloadHttpServer') === undefined)
  })
})
