/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')

describe('Constructor params', function () {
  const appDir = path.join(__dirname, '../app/constructorParam')
  const config = require('../lib/testConstructorConfig.json')
  const pkgConfig = require('../lib/testPkgConfig.json')
  let paramaters = Object.keys(config)
  const pkg = {
    rooseveltConfig: pkgConfig
  }
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(pkg))

    app = require('../../roosevelt')({
      appDir: appDir,
      ...config
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

  paramaters.forEach(function (Individualparams) {
    if (Individualparams !== 'suppressLogs' && Individualparams !== 'generateFolderStructure') {
      it('should set param ' + Individualparams + ' from constructor', function () {
        assert.equal(app.expressApp.get('params')[Individualparams], config[Individualparams])
      })
    }
  })
})
