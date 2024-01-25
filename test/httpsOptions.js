/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const fs = require('fs-extra')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

describe.skip('HTTPS Server Options Tests', async () => {
  // test app directory, configuration, and app variables
  const appDir = path.join(__dirname, 'app/constructorParams')
  const config = require('./util/testHttpsConfig.json')
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
  function certsGenerator (appDir) {
    const selfsigned = require('selfsigned')
    const forge = require('node-forge')
    const pem = selfsigned.generate(null, {
      keySize: 2048, // the size for the private key in bits (default: 1024)
      days: 365000, // how long till expiry of the signed certificate (default: 10,000)
      algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
      extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
      pkcs7: true, // include PKCS#7 as part of the output (default: false)
      clientCertificate: true, // generate client cert signed by the original key (default: false)
      clientCertificateCN: 'unknown' // client certificate's common name (default: 'John Doe jdoe123')
    })

    const fs = require('fs')
    const key = pem.private
    const cert = pem.cert
    const path = require('path')

    if (!appDir) {
      let processEnv
      if (fs.existsSync(path.join(process.cwd(), 'node_modules')) === false) {
        processEnv = process.cwd()
      } else {
        processEnv = undefined
      }
      appDir = processEnv
    }
    const certificate = forge.pki.certificateFromPem(cert)
    const privateKey = forge.pki.privateKeyFromPem(key)

    // generate p12 and encrypt them
    const p12Info = forge.pkcs12.toPkcs12Asn1(privateKey, certificate, '', { generateLocalKeyId: true, algorithm: '3des' })
    const p12Cert = forge.asn1.toDer(p12Info).getBytes()

    try {
      if (!fs.existsSync('./test/app/secrets')) {
        fs.mkdirSync('./test/app/secrets')
      }

      fs.writeFileSync('./test/app/secrets/sessionSecret.json', JSON.stringify({ secret: 'sample secret' }), err => {
        if (err) {
          console.error(err)
        }
      })

      fs.writeFileSync('./test/app/secrets/key.pem', key, err => {
        if (err) {
          console.error(err)
        }
        // file written successfully
      })

      fs.writeFileSync('./test/app/secrets/cert.pem', cert, err => {
        if (err) {
          console.error(err)
        }
        // file written successfully
      })

      fs.writeFileSync('./test/app/secrets/cert.p12', p12Cert, err => {
        if (err) {
          console.error(err)
        }
        // file written successfully
      })
    } catch (e) { console.log(e) }
  }

  before(async () => {
    app = proxyquire('../roosevelt', { https: stubHttps, http: stubHttp, expressSession: false })
    certsGenerator()
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
    fs.rmSync('./test/app/certs', { recursive: true, force: true })

    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should create a https server when https.enable is set to true', function () {
    app({ appDir, ...config })

    // test assertion
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create a http server and a https server when the https.force param is false', function () {
    // change config
    config.https.force = false

    app({ appDir, ...config })

    // test assertion
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create a http server when https.enable param is false and https.force param is true', function () {
    // change config
    config.https.force = true
    config.https.enable = false

    app({ appDir, ...config })

    // test assertion
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.notCalled, 'https.Server was called')

    config.https.enable = true
  })

  it('should not create a http.Server when the https.force param is set to true', function () {
    // change config
    config.https.force = true

    app({ appDir, ...config })

    // test assertion
    assert(stubHttpServer.notCalled, 'http.Server called despite force flag')
  })

  it('should start a https server using the given p12 file and passphrase if the p12Path param is set to a file path string and the passphrase is set', function () {
    app({ appDir, ...config })

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(fs.existsSync(path.join(appDir, './../../../test/app/secrets/cert.p12')) === true, 'file at config p12 file path does not exist')
    assert(stubHttpsServer.args[0][0].passphrase === config.https.passphrase, 'https.Server passphrase did not match config passphrase')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given p12 buffer and passphrase if the p12.p12Path param is set to a PKCS#12 formatted buffer and passphrase is set', function () {
    const p12text = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.p12'), 'utf8')
    config.https.authInfoPath.p12.p12Path = p12text
    app({ appDir, ...config })

    // test assertions
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using p12')
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using p12')
    assert(stubHttpsServer.args[0][0].pfx.toString() === p12text, 'https.Server p12 file did not match supplied')
    assert(stubHttpsServer.args[0][0].passphrase === config.https.passphrase, 'https.Server passphrase did not match supplied')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with file path strings', function () {
    const keytext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))
    const certext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))
    // change config - unset p12Path
    config.https.authInfoPath.p12.p12Path = ''
    config.https.authInfoPath.authCertAndKey.key = keytext
    config.https.authInfoPath.authCertAndKey.cert = certext

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if one is a certificate string and one is a file path', function () {
    const keytext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))
    const certext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))

    // change config - change key to a string
    config.https.authInfoPath.p12.p12Path = null
    config.https.authInfoPath.authCertAndKey.key = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))
    config.https.authInfoPath.authCertAndKey.cert = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))

    app({ appDir, ...config })

    // // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the given certAndKey.cert and certAndKey.key params if they are set with certificate strings', function () {
    const keytext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))
    const certext = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))

    // change config - change cert to a  string
    config.https.authInfoPath.authCertAndKey.key = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))
    config.https.authInfoPath.authCertAndKey.cert = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server options had pfx set when p12Path was null')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the certificate authority certificate from a file if the caCert param is set with a file path', function () {
    config.https.authInfoPath.p12.p12Path = null

    app({ appDir, ...config })

    // test assertion
    assert(config.https.caCert === 'test/app/secrets/cert.pem', 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https using a certificate chain as an array of certificates when the caCert param is set with an array of file paths', function () {
    // change config
    config.https.caCert = [path.join(appDir, './../../../test/app/secrets/cert.pem'), path.join(appDir, './../../../test/app/secrets/key.pem'), path.join(appDir, './../../../test/app/secrets/sessionSecret.json')]

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert param directly if it is set as a certificate string', function () {
    // change config
    config.https.caCert = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'), 'UTF8')

    app({ appDir, ...config })

    // test assertion
    assert.strictEqual(stubHttpsServer.args[0][0].ca, config.https.caCert, 'https.Server CA did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if the caCert param is set as an array of certificate strings', function () {
    const ca1 = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))
    const ca2 = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))

    // change config
    config.https.caCert = [ca1, ca2]

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server using the caCert certificate chain if it the caCert param set as an array of mixed file paths and certificate strings', function () {
    const ca1 = fs.readFileSync(path.join(appDir, './../../../test/app/secrets/cert.pem'))

    // change config
    config.https.caCert = [ca1, path.join(appDir, './../../../test/app/secrets/key.pem')]

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(fs.readFileSync(path.join(appDir, './../../../test/app/secrets/key.pem'))), 'https.Server CA (2) did not match supplied CA')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should start a https server if the caCert param is not a string or an array', function () {
    // change config
    config.https.caCert = 42

    app({ appDir, ...config })

    // test assertions
    assert(stubHttpsServer.called, 'https.Server was not called')
  })
})
