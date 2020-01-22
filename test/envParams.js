/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('ENV Parameter Tests', function () {
  const appConfig = {
    appDir: path.join(__dirname, '../app/envParams'),
    enableCLIFlags: false,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false
      }
    },
    https: {
      port: 12345
    }
  }
  let app

  it('should change the enable param to true', function (done) {
    process.env.ROOSEVELT_VALIDATOR = 'detached'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.enable, true)
    delete process.env.ROOSEVELT_VALIDATOR
    done()
  })

  it('should change the enable param to false', function (done) {
    process.env.ROOSEVELT_VALIDATOR = 'attached'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.enable, false)
    delete process.env.ROOSEVELT_VALIDATOR
    done()
  })

  it('should disable validator if HTTP_PROXY is set and NO_PROXY does not contain localhost', function (done) {
    process.env.HTTP_PROXY = true
    process.env.NO_PROXY = 'hsdfhjsdf hdsfjhsdf dhf sdhjfhsd fhjsdf dshjfhs'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.enable, false)
    delete process.env.HTTP_PROXY
    delete process.env.NO_PROXY
    done()
  })

  it('should disable validator if HTTPS_PROXY is set and NO_PROXY does not contain localhost', function (done) {
    process.env.HTTPS_PROXY = true
    process.env.NO_PROXY = 'blah'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.enable, false)
    delete process.env.HTTPS_PROXY
    delete process.env.NO_PROXY
    done()
  })

  it('should change the https.port param to 45678', function (done) {
    process.env.HTTPS_PORT = 45678

    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').https.port, 45678)
    delete process.env.HTTPS_PORT
    done()
  })

  it('should set validator autokiller param to true for separate processes', function (done) {
    process.env.ROOSEVELT_AUTOKILLER = 'on'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.autoKiller, true)
    delete process.env.ROOSEVELT_AUTOKILLER
    done()
  })

  it('should set validator autokiller param to false for separate processes', function (done) {
    process.env.ROOSEVELT_AUTOKILLER = 'off'
    app = roosevelt(appConfig)
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.autoKiller, false)
    delete process.env.ROOSEVELT_AUTOKILLER
    done()
  })
})
