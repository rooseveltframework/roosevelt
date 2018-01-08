/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

describe('Constructor params', function () {
  const appDir = path.join(__dirname, '../app/constructorParam')
  const config = require('../lib/testConstructorConfig.json')
  const pkgConfig = require('../lib/testPkgConfig.json')
  const pkg = {
    rooseveltConfig: pkgConfig
  }
  let app

  before(function () {
    fs.mkdirSync(path.join(appDir))
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

  it('should set param "port" from constructor', function () {
    assert.equal(app.expressApp.get('params').port, config.port)
  })

  it('should set param "localhostOnly" from constructor', function () {
    assert.equal(app.expressApp.get('params').localhostOnly, config.localhostOnly)
  })
})
