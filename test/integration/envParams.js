/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const roosevelt = require('../../roosevelt')

describe('ENV Parameter Tests', function () {
  const appConfig = {
    appDir: path.join(__dirname, '../app/envParams'),
    ignoreCLIFlags: true,
    logging: {
      http: false,
      appStatus: false,
      warnings: false
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
})
