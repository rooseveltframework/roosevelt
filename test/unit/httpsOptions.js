/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fs = require('fs')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

describe('HTTPS server options', function () {
  const appDir = path.join(__dirname, '../app/constructorParams')
  const config = require('../util/testHttpsConfig.json')

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

  let app

  before(function () {
    app = proxyquire('../../roosevelt', {'https': stubHttps, 'http': stubHttp})
  })

  afterEach(function () {
    stubHttpsListen.resetHistory()
    stubHttpsOn.resetHistory()
    stubHttpsServer.resetHistory()

    stubHttpServer.resetHistory()
  })

  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should create https.Server when enabled', function () {
    app({appDir: appDir, ...config})
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create http.Server when httpsOnly is false', function () {
    config.https.httpsOnly = false

    app({appDir: appDir, ...config})
    assert(stubHttpServer.called, 'http.Server was not called')

    config.https.httpsOnly = true
  })

  it('should not create http.Server when httpsOnly is true', function () {
    app({appDir: appDir, ...config})
    assert(stubHttpServer.notCalled, 'http.Server called despite httpsOnly flag')
  })

  it('should use given pfx file if pfx option is true', function () {
    let keytext = fs.readFileSync(path.join(__dirname, '../util/certs/test.p12'))

    config.https.pfx = true

    app({appDir: appDir, ...config})
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using pft')
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using pfx')
    assert(stubHttpsServer.args[0][0].pfx.equals(keytext), 'https.Server pfx file did not match supplied')

    config.https.pfx = false
  })

  it('should use key/cert if pfx option is false', function () {
    let keytext = fs.readFileSync(path.join(__dirname, '../util/certs/test.req.key'))
    let certext = fs.readFileSync(path.join(__dirname, '../util/certs/test.req.crt'))

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server had pfx when using key/cert')
  })

  it('should read certificate authority from file if cafile is true', function () {
    let catext = fs.readFileSync(path.join(__dirname, '../util/certs/ca.crt'))

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].ca.equals(catext), 'https.Server CA did not match supplied CA')
  })

  it('should be able to read array of certificates', function () {
    let ca1 = fs.readFileSync(path.join(__dirname, '../util/certs/ca.crt'))
    let ca2 = fs.readFileSync(path.join(__dirname, '../util/certs/ca-2.crt'))

    config.https.ca = ['test/util/certs/ca.crt', 'test/util/certs/ca-2.crt']

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')

    config.https.ca = 'test/util/certs/ca.crt'
  })

  it('should pass certificate authority directly to httpsServer if cafile is false', function () {
    config.https.cafile = false
    config.https.ca = fs.readFileSync(config.https.ca, 'UTF8')

    app({appDir: appDir, ...config})
    assert.equal(stubHttpsServer.args[0][0].ca, config.https.ca, 'https.Server CA did not match supplied CA')

    config.https.ca = 'test/util/certs/ca.crt'
    config.https.cafile = true
  })
})
