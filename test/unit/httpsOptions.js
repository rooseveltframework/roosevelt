/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
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

  const stubHttpListen = sinon.stub()
  const stubHttpOn = sinon.stub()
  const stubHttpServer = sinon.stub().returns({
    listen: stubHttpListen,
    on: stubHttpOn
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

    stubHttpListen.resetHistory()
    stubHttpOn.resetHistory()
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
    assert(stubHttpServer.called, 'http.Server was not called')
  })

  it('should not create http.Server when httpsOnly is true', function () {
    config.https.httpsOnly = true

    app({appDir: appDir, ...config})
    assert(stubHttpServer.notCalled, 'http.Server called despite httpsOnly flag')
  })

  it('should use given pfx file if pfx option is true', function () {

  })

  it('should use key/cert if pfx option is false', function () {
    config.https.pfx = false
    // test
    config.https.pfx = true
  })

  it('should read certificate authority from file if cafile is true', function () {
    // start app
    // read in ca file
    // assert.equal(stubHttpsServer.args[0][0].ca, `fs-read ca`, 'https.Server CA did not match CA read from file')
  })

  it('should be able to read array of certificates', function () {

  })

  it('should pass certificate authority directly to httpsServer if cafile is false', function () {
    config.https.cafile = false
    config.https.ca = ['test ca text']

    app({appDir: appDir, ...config})
    assert.equal(stubHttpsServer.args[0][0].ca, config.https.ca, 'https.Server CA did not match supplied CA')

    config.https.ca = 'original'
    config.https.cafile = true
  })

  it('should start the https server with the correct options', function () {
    app({appDir: appDir, ...config})
    assert.equal(stubHttpsServer.args[0][0], config.https.httpsPort, 'httpsServer.listen port did not match supplied port')
    assert.equal(stubHttpsServer.args[0][1], 'localhost', 'httpsServer.listen domain did not match localhost')
  })
})
