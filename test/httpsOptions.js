/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const generateTestCerts = require('./util/generateTestCerts')

describe('HTTPS Server Options Tests', async () => {
  // test app directory, configuration, and app variables
  const config = require('./util/testHttpsConfig.json')
  config.appDir = path.join(__dirname, 'app/httpsTests')

  // sinon stubs
  const stubHttpsListen = sinon.stub()
  const stubHttpsOn = sinon.stub()
  const stubHttpsServer = sinon.stub().returns({
    listen: stubHttpsListen,
    on: stubHttpsOn
  })
  const stubHttps = {
    Server: stubHttpsServer
  }
  const stubHttpServer = sinon.stub().returns({
    listen: sinon.stub(),
    on: sinon.stub()
  })
  const stubHttp = {
    Server: stubHttpServer
  }

  before(() => {
    generateTestCerts(config.appDir, config.secretsPath)
  })

  // reset stubs after each
  afterEach(() => {
    stubHttpsListen.resetHistory()
    stubHttpsOn.resetHistory()
    stubHttpsServer.resetHistory()
    stubHttpServer.resetHistory()
  })

  after(async () => {
    await fs.remove(config.appDir)
  })

  it('should create a https server when https.enable is set to true', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(config)
    await app.initServer()

    // test assertion
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create a http server and a https server when the https.force param is false', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.force = false

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertion
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create a http server when https.enable param is false and https.force param is true', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.enable = false

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertion
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.notCalled, 'https.Server was called')
  })

  it('should not create a http.Server when the https.force param is set to true', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(config)
    await app.initServer()

    // test assertion
    assert(stubHttpServer.notCalled, 'http.Server called despite force flag')
  })

  it('should start a https server using the given p12 file and passphrase if the p12Path param is set to a file path string and the passphrase is set', async () => {
    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(config)
    await app.initServer()

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(fs.pathExistsSync(path.join(config.appDir, 'secrets/cert.p12')) === true, 'file at config p12 file path does not exist')
    assert(stubHttpsServer.args[0][0].passphrase === config.https.passphrase, 'https.Server passphrase did not match config passphrase')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given p12 buffer and passphrase if the p12.p12Path param is set to a PKCS#12 formatted buffer and passphrase is set', async () => {
    const p12text = fs.readFileSync(path.join(config.appDir, 'secrets/cert.p12'), 'utf8')
    const options = JSON.parse(JSON.stringify(config))
    options.https.authInfoPath.p12.p12Path = p12text

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(stubHttpsServer.args[0][0].pfx.toString() === p12text, 'https.Server p12 file did not match supplied')
    assert(stubHttpsServer.args[0][0].passphrase === options.https.passphrase, 'https.Server passphrase did not match supplied')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with file path strings', async () => {
    const keytext = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    const certext = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))
    const options = JSON.parse(JSON.stringify(config))
    options.https.authInfoPath.p12.p12Path = ''
    options.https.authInfoPath.authCertAndKey.key = keytext
    options.https.authInfoPath.authCertAndKey.cert = certext

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)

    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if one is a certificate string and one is a file path', async () => {
    const keytext = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    const certext = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))

    const options = JSON.parse(JSON.stringify(config))
    options.https.authInfoPath.p12.p12Path = null
    options.https.authInfoPath.authCertAndKey.key = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    options.https.authInfoPath.authCertAndKey.cert = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with certificate strings', async () => {
    const keytext = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    const certext = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))

    const options = JSON.parse(JSON.stringify(config))
    options.https.authInfoPath.p12.p12Path = null
    options.https.authInfoPath.authCertAndKey.key = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    options.https.authInfoPath.authCertAndKey.cert = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the certificate authority certificate from a file if the caCert param is set with a file path', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.authInfoPath.p12.p12Path = null

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertion
    assert(options.https.caCert === 'cert.pem', 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https using a certificate chain as an array of certificates when the caCert param is set with an array of file paths', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.caCert = [path.join(config.appDir, 'secrets/cert.pem'), path.join(config.appDir, 'secrets/key.pem')]

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert param directly if it is set as a certificate string', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.caCert = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'), 'UTF8')

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertion
    assert.strictEqual(stubHttpsServer.args[0][0].ca, options.https.caCert, 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if the caCert param is set as an array of certificate strings', async () => {
    const ca1 = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))
    const ca2 = fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))
    const options = JSON.parse(JSON.stringify(config))
    options.https.caCert = [ca1, ca2]

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if it the caCert param set as an array of mixed file paths and certificate strings', async () => {
    const ca1 = fs.readFileSync(path.join(config.appDir, 'secrets/cert.pem'))
    const options = JSON.parse(JSON.stringify(config))
    options.https.caCert = [ca1, path.join(config.appDir, 'secrets/key.pem')]

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(fs.readFileSync(path.join(config.appDir, 'secrets/key.pem'))), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server if the caCert param is not a string or an array', async () => {
    const options = JSON.parse(JSON.stringify(config))
    options.https.caCert = 42

    const roosevelt = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp })
    const app = roosevelt(options)
    await app.initServer()

    // test assertions
    assert(stubHttpsServer.called, 'https.Server was not called')
  })
})
