/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Default Params', function () {
  const defaults = require('../../lib/defaults/config.json')
  let params = Object.keys(defaults)
  let app

  before(function () {
    app = require('../../roosevelt')({
      appDir: path.join(__dirname, '../app/defaultParams'),
      suppressLogs: {
        httpsLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      }
    })
  })

  params.forEach((param) => {
    if (param !== 'suppressLogs' && param !== 'generateFolderStructure') {
      it(`should set correct default for param "${param}"`, function () {
        assert.deepEqual(app.expressApp.get('params')[param], defaults[param])
      })
    }
  })
})
