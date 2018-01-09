/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Default Params', function () {
  const defaults = require('../../lib/defaults/config.json')
  let paramaters = Object.keys(defaults)
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

  paramaters.forEach(function (Individualparams) {
    if (Individualparams !== 'suppressLogs' && Individualparams !== 'generateFolderStructure') {
      it('should set correct default for param ' + Individualparams, function () {
        assert.equal(app.expressApp.get('params')[Individualparams], defaults[Individualparams])
      })
    }
  })
})
