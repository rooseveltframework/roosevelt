/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Default Params', function () {
  const defaults = require('../../lib/defaults/config.json')
  let app

  before(function () {
    app = require('../../roosevelt')({
      appDir: path.join(__dirname, '../app/defaultParam'),
      suppressLogs: {
        httpsLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      }
    })
  })

  it('should set correct default for param "port"', function () {
    assert.equal(app.expressApp.get('params').port, defaults.port)
  })

  it('should set correct default for param "localhostOnly"', function () {
    assert.equal(app.expressApp.get('params').localhostOnly, defaults.localhostOnly)
  })
})
