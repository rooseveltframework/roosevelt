/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const roosevelt = require('../../roosevelt')

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
    const temp = process.env.ROOSEVELT_VALIDATOR
    process.env.ROOSEVELT_VALIDATOR = 'detached'
    app = roosevelt({
      ...appConfig
    })
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.enable, true)
    process.env.ROOSEVELT_VALIDATOR = temp
    done()
  })

  it('should change the enable param to false', function (done) {
    const temp = process.env.ROOSEVELT_VALIDATOR
    process.env.ROOSEVELT_VALIDATOR = 'attached'
    app = roosevelt({
      ...appConfig
    })
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.enable, false)
    process.env.ROOSEVELT_VALIDATOR = temp
    done()
  })

  it('should change the https.port param to 45678', function (done) {
    process.env.HTTPS_PORT = 45678
    app = roosevelt({
      ...appConfig
    })
    assert.strictEqual(app.expressApp.get('params').https.port, '45678')
    delete process.env.HTTPS_PORT
    done()
  })

  it('should set validator autokiller param to true for separate processes', function (done) {
    const temp = process.env.ROOSEVELT_AUTOKILLER
    process.env.ROOSEVELT_AUTOKILLER = 'on'
    app = roosevelt({
      ...appConfig
    })
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.autoKiller, true)
    process.env.ROOSEVELT_AUTOKILLER = temp
    done()
  })

  it('should set validator autokiller param to false for separate processes', function (done) {
    const temp = process.env.ROOSEVELT_AUTOKILLER
    process.env.ROOSEVELT_AUTOKILLER = 'off'
    app = roosevelt({
      ...appConfig
    })
    assert.strictEqual(app.expressApp.get('params').htmlValidator.separateProcess.autoKiller, false)
    process.env.ROOSEVELT_AUTOKILLER = temp
    done()
  })
})
