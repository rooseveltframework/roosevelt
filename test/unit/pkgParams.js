/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')

describe('package.json params', function () {
  const appDir = path.join(__dirname, '../app/pkgParams')
  const pkgConfig = require('../util/testPkgConfig.json')
  let params = Object.keys(pkgConfig)
  const pkg = {
    rooseveltConfig: pkgConfig
  }
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(pkg))

    app = require('../../roosevelt')({
      appDir: appDir,
      ignoreCLIFlags: true
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
    if (param !== 'logging' && param !== 'generateFolderStructure') {
      it(`should set param "${param}" from package.json`, function () {
        assert.deepEqual(app.expressApp.get('params')[param], pkgConfig[param])
      })
    }
  })
})
