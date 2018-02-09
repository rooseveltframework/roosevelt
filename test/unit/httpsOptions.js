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
    assert(stubHttpServer.called, 'http.Server was not called')
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should not create http.Server when httpsOnly is true', function () {
    config.https.httpsOnly = true

    app({appDir: appDir, ...config})
    assert(stubHttpServer.called === false, 'http.Server called despite httpsOnly flag')
  })
})
