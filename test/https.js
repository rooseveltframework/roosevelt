/* eslint-env mocha */

const fs = require('fs-extra')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const generateTestCerts = require('./util/generateTestCerts')

describe('HTTPS', async () => {
  // test app directory, configuration, and app variables
  const appDir = path.join(__dirname, 'app/httpsTests')
  const baseConfig = {
    appDir,
    http: {
      enable: false
    },
    makeBuildArtifacts: false,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false
      }
    },
    expressSession: false,
    secretsPath: 'secrets',
    csrfProtection: false
  }

  // sinon stubs
  const stubHttpsListen = sinon.stub()
  const stubHttpsOn = sinon.stub()
  const stubHttpsServer = sinon.stub().returns({
    listen: stubHttpsListen,
    on: stubHttpsOn
  })
  const stubHttps = {
    createServer: stubHttpsServer
  }
  const stubHttpServer = sinon.stub().returns({
    listen: sinon.stub(),
    on: sinon.stub()
  })
  const stubHttp = {
    createServer: stubHttpServer
  }

  before(() => {
    generateTestCerts(appDir, baseConfig.secretsPath)
  })

  // reset stubs after each
  afterEach(() => {
    stubHttpsListen.resetHistory()
    stubHttpsOn.resetHistory()
    stubHttpsServer.resetHistory()
    stubHttpServer.resetHistory()
  })

  after(async () => {
    await fs.remove(appDir)
  })

  it('should create an http server when http.enable is true', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      http: {
        enable: true
      },
      https: {
        enable: false
      }
    })
    await app.initServer()

    sinon.assert.calledOnce(stubHttpServer)
    sinon.assert.notCalled(stubHttpsServer)
  })

  it('should create a https server when https.enable is true', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true
      }
    })
    await app.initServer()

    sinon.assert.calledOnce(stubHttpsServer)
    sinon.assert.notCalled(stubHttpServer)
  })

  it('should create both http and https servers when both are enabled', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      http: {
        enable: true
      },
      https: {
        enable: true
      }
    })
    await app.initServer()

    sinon.assert.calledOnce(stubHttpsServer)
    sinon.assert.calledOnce(stubHttpServer)
  })

  it('should start a https server using the given cert and key params if they are set with file path strings', async () => {
    const certBuffer = await fs.readFile(path.join(appDir, 'secrets/cert.pem'))
    const keyBuffer = await fs.readFile(path.join(appDir, 'secrets/key.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          cert: 'cert.pem',
          key: 'key.pem'
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      cert: certBuffer,
      key: keyBuffer
    })
  })

  it('should start a https server using the given cert and key params when one is a string and the other is a path', async () => {
    const certBuffer = await fs.readFile(path.join(appDir, 'secrets/cert.pem'))
    const keyString = await fs.readFile(path.join(appDir, 'secrets/key.pem'), 'utf8')

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          cert: 'cert.pem',
          key: keyString
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      cert: certBuffer,
      key: keyString
    })
  })

  it('should start a https server using the given cert and key params when set as arrays containing paths and strings', async () => {
    const certString = await fs.readFile(path.join(appDir, 'secrets/cert.pem'), 'utf8')
    const keyBuffer = await fs.readFile(path.join(appDir, 'secrets/key.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          cert: [certString],
          key: ['key.pem']
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      cert: [certString],
      key: [keyBuffer]
    })
  })

  it('should start a https server using the given pfx param set as a path', async () => {
    const p12Buffer = await fs.readFile(path.join(appDir, 'secrets/cert.p12'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          pfx: 'cert.p12',
          passphrase: 'testpass'
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      pfx: p12Buffer,
      passphrase: 'testpass'
    })
  })

  it('should start a https server using the given pfx param set as a buffer', async () => {
    const p12Buffer = await fs.readFile(path.join(appDir, 'secrets/cert.p12'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          pfx: p12Buffer,
          passphrase: 'testpass'
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      pfx: p12Buffer,
      passphrase: 'testpass'
    })
  })

  it('should start a https server using the given pfx param set as an array containing a path', async () => {
    const p12Buffer = await fs.readFile(path.join(appDir, 'secrets/cert.p12'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          pfx: ['cert.p12'],
          passphrase: 'testpass'
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      pfx: [p12Buffer],
      passphrase: 'testpass'
    })
  })

  it('should start a https server using the given ca param set as a path', async () => {
    const certBuffer = await fs.readFile(path.join(appDir, 'secrets/cert.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          ca: 'cert.pem'
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      ca: certBuffer
    })
  })

  it('should start a https server using the given ca param set as a cert buffer', async () => {
    const certBuffer = await fs.readFile(path.join(appDir, 'secrets/cert.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          ca: certBuffer
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      ca: certBuffer
    })
  })

  it('should start a https server using the given ca param set as an array of paths, cert strings, and cert buffers', async () => {
    const certBuffer = await fs.readFile(path.join(appDir, 'secrets/cert.pem'))
    const keyBuffer = await fs.readFile(path.join(appDir, 'secrets/key.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt({
      ...baseConfig,
      https: {
        enable: true,
        options: {
          ca: [certBuffer, 'key.pem', certBuffer.toString()]
        }
      }
    })
    await app.initServer()

    sinon.assert.calledWith(stubHttpsServer, {
      ca: [certBuffer, keyBuffer, certBuffer.toString()]
    })
  })
})
