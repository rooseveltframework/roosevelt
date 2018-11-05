/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Default Parameter Tests', function () {
  const defaults = require('../../lib/defaults/config.json')
  let params = Object.keys(defaults)
  let app

  before(function () {
    app = require('../../roosevelt')({
      appDir: path.join(__dirname, '../app/defaultParams'),
      enableCLIFlags: false,
      logging: {
        http: false,
        appStatus: false,
        warnings: false
      }
    })
  })

  params.forEach((param) => {
    if (param !== 'logging' && param !== 'generateFolderStructure' && param !== 'staticsSymlinksToPublic') {
      it(`should set correct default for param "${param}"`, function () {
        assert.deepStrictEqual(app.expressApp.get('params')[param], defaults[param])
      })
    }
  })
})
