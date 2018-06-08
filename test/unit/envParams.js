/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const roosevelt = require('../../roosevelt')

describe('ENV Params Test', function () {
  const appConfig = {
    appDir: path.join(__dirname, '../app/envParams'),
    ignoreCLIFlags: true,
    suppressLogs: {
      httpsLogs: true,
      rooseveltLogs: true,
      rooseveltWarnings: true
    }
  }
  let app

  it('should change the enable param to true', function (done) {
    const temp = process.env.ROOSEVELT_IS_DETACHED
    process.env.ROOSEVELT_IS_DETACHED = true
    app = roosevelt({
      ...appConfig
    })
    assert.equal(app.expressApp.get('params').htmlValidator.separateProcess.enable, true)
    process.env.ROOSEVELT_IS_DETACHED = temp
    done()
  })

  it('should change the enable param to false', function (done) {
    const temp = process.env.ROOSEVELT_IS_DETACHED
    process.env.ROOSEVELT_IS_DETACHED = false
    app = roosevelt({
      ...appConfig
    })
    assert.equal(app.expressApp.get('params').htmlValidator.separateProcess.enable, false)
    process.env.ROOSEVELT_IS_DETACHED = temp
    done()
  })
})
