/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const defaults = require('../../lib/defaults/config.json')
const app = require('../../roosevelt')({
  appDir: path.join(__dirname, '../app'),
  suppressLogs: {
    httpsLogs: true,
    rooseveltLogs: true,
    rooseveltWarnings: true
  }
})

describe('Default Params', function () {
  const params = app.expressApp.get('params')

  it('should set correct default for param "port"', function () {
    assert.equal(params.port, defaults.port)
  })

  it('should set correct default for param "localhostOnly"', function () {
    assert.equal(params.localhostOnly, defaults.localhostOnly)
  })
})
