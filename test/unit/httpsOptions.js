/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fse = require('fs-extra')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

describe('HTTPS Server Options Tests', function () {
  // test app directory, configuration, and app variables
  const appDir = path.join(__dirname, '../app/constructorParams')
  const config = require('../util/testHttpsConfig.json')
  let app

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

  before(function () {
    app = proxyquire('../../roosevelt', { https: stubHttps, http: stubHttp })
  })

  // reset stubs after each
  afterEach(function () {
    stubHttpsListen.resetHistory()
    stubHttpsOn.resetHistory()
    stubHttpsServer.resetHistory()
    stubHttpServer.resetHistory()
  })

  // after all tests clean up the test app directory
  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should create a https server when https.enable is set to true', function () {
    app({ appDir: appDir, ...config })

    // test assertion
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create a http server and a https server when the https.force param is false', function () {
    // change config
    config.https.force = false

    app({ appDir: appDir, ...config })

    // test assertion
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should not create a http.Server when the https.force param is set to true', function () {
    // change config
    config.https.force = true

    app({ appDir: appDir, ...config })

    // test assertion
    assert(stubHttpServer.notCalled, 'http.Server called despite force flag')
  })

  it('should start a https server using the given p12 file and passphrase if the p12Path param is set to a file path string and the passphrase is set', function () {
    const p12text = fse.readFileSync(path.join(appDir, '../../util/certs/test.p12'), 'utf8')

    app({ appDir: appDir, ...config })

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(stubHttpsServer.args[0][0].pfx.toString() === p12text, 'https.Server p12 file did not match file at config p12 file path')
    assert(stubHttpsServer.args[0][0].passphrase === config.https.authInfoPath.p12.passphrase, 'https.Server passphrase did not match config passphrase')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given p12 buffer and passphrase if the p12.p12Path param is set to a PKCS#12 formatted buffer and p12.passphrase is set', function () {
    const p12text = fse.readFileSync(path.join(appDir, '../../util/certs/test.p12'), 'utf8')
    config.https.authInfoPath.p12.p12Path = p12text
    app({ appDir: appDir, ...config })

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(stubHttpsServer.args[0][0].pfx.toString() === p12text, 'https.Server p12 file did not match supplied')
    assert(stubHttpsServer.args[0][0].passphrase === config.https.authInfoPath.p12.passphrase, 'https.Server passphrase did not match supplied')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with file path strings', function () {
    const keytext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.key'))
    const certext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.crt'))

    // change config - unset p12Path
    config.https.authInfoPath.p12.p12Path = ''

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if one is a certificate string and one is a file path', function () {
    const certext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.crt'))
    const keytext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.key'))

    // change config - change key to a string
    config.https.authInfoPath.authCertAndKey.key = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.key'))

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with certificate strings', function () {
    const certext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.crt'))
    const keytext = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.key'))

    // change config - change cert to a  string
    config.https.authInfoPath.authCertAndKey.cert = fse.readFileSync(path.join(appDir, '../../util/certs/test.req.crt'))

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the certificate authority certificate from a file if the caCert param is set with a file path', function () {
    const catext = fse.readFileSync(path.join(appDir, '../../util/certs/ca.crt'))

    app({ appDir: appDir, ...config })

    // test assertion
    assert(stubHttpsServer.args[0][0].ca.equals(catext), 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https using a certificate chain as an array of certificates when the caCert param is set with an array of file paths', function () {
    const ca1 = fse.readFileSync(path.join(appDir, '../../util/certs/ca.crt'))
    const ca2 = fse.readFileSync(path.join(appDir, '../../util/certs/ca-2.crt'))

    // change config
    config.https.caCert = ['test/util/certs/ca.crt', 'test/util/certs/ca-2.crt']

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert param directly if it is set as a certificate string', function () {
    // change config
    config.https.caCert = fse.readFileSync(path.join(appDir, '../../util/certs/ca.crt'), 'UTF8')

    app({ appDir: appDir, ...config })

    // test assertion
    assert.strictEqual(stubHttpsServer.args[0][0].ca, config.https.caCert, 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if the caCert param is set as an array of certificate strings', function () {
    const ca1 = fse.readFileSync(path.join(appDir, '../../util/certs/ca.crt'))
    const ca2 = fse.readFileSync(path.join(appDir, '../../util/certs/ca-2.crt'))

    // change config
    config.https.caCert = [ca1, ca2]

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if it the caCert param set as an array of mixed file paths and certificate strings', function () {
    const ca1 = fse.readFileSync(path.join(appDir, '../../util/certs/ca.crt'))
    const ca2 = fse.readFileSync(path.join(appDir, '../../util/certs/ca-2.crt'))

    // change config
    config.https.caCert = [ca1, path.join(appDir, '../../util/certs/ca-2.crt')]

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server if the caCert param is not a string or an array', function () {
    // change config
    config.https.caCert = 42

    app({ appDir: appDir, ...config })

    // test assertions
    assert(stubHttpsServer.called, 'https.Server was not called')
  })
})
