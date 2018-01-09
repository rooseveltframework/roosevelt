/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Default Params', function () {
  const defaults = require('../../lib/defaults/config.json')
  let param = Object.keys(defaults)
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

  param.forEach((individualParams) => {
    if (individualParams !== 'suppressLogs' && individualParams !== 'generateFolderStructure') {
      it(`should set correct default for param "${individualParams}"`, function () {
        assert.equal(app.expressApp.get('params')[individualParams], defaults[individualParams])
      })
    }
  })
})
