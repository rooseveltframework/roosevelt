/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')

describe('package.json params', function () {
  const appDir = path.join(__dirname, '../app/packageParam')
  const pkgConfig = require('../lib/testPkgConfig.json')
  let arg = Object.keys(pkgConfig)
  const pkg = {
    rooseveltConfig: pkgConfig
  }
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(pkg))

    app = require('../../roosevelt')({
      appDir: appDir
    })
  })

  after(function (done) {
    rimraf(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  arg.forEach((individualParams) => {
    if (individualParams !== 'suppressLogs' && individualParams !== 'generateFolderStructure') {
      it(`should set param "${individualParams}" from package.json`, function () {
        assert.equal(app.expressApp.get('params')[individualParams], pkgConfig[individualParams])
      })
    }
  })
})
