/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')

describe('package.json Parameter Tests', function () {
  const appDir = path.join(__dirname, '../app/pkgParams')
  const pkgConfig = require('../util/testPkgConfig.json')
  const params = Object.keys(pkgConfig)
  const pkg = {
    rooseveltConfig: pkgConfig
  }
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(pkg))
    app = require('../../roosevelt')({
      appDir: appDir,
      enableCLIFlags: false
    })
  })

  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  params.forEach((param) => {
    if (param !== 'logging' && param !== 'generateFolderStructure' && param !== 'staticsSymlinksToPublic') {
      it(`should set param "${param}" from package.json`, function () {
        assert.deepStrictEqual(app.expressApp.get('params')[param], pkgConfig[param])
      })
    }
  })
})
