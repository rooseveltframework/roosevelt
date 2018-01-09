/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')

describe('Folder Tests', function () {
  const appDir = path.join(__dirname, '../app/folderTest')
  const folderPaths = require('../lib/testFolderDirPathConfig.json')
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))

    app = require('../../roosevelt')({
      appDir: appDir,
      generateFolderStructure: true,
      ...folderPaths
    })

    app.initServer(function () {})
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

  it('should have made a new directory for "views" based on the given parameters and be a directory', function () {
    const foldertest = path.join(__dirname, '../app/folderTest/mvc/viewsTest')
    const foldertesterror = path.join(__dirname, '../app/folderTest/mvc/viewsTests')
    let test = fs.existsSync(foldertest)
    assert.equal(test, true)

    fs.lstat(foldertesterror, (err, stats) => {
      if (err) {
        assert.fail(21, 42, 'Test Failed', '###')
      }
    })
  })

  it('should have made a new directory for "models" based on the given parameters and be a directory', function () {
    const foldertest = path.join(__dirname, '../app/folderTest/mvc/modelsTest')
    let test = fs.existsSync(foldertest)
    assert.equal(test, true)

    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        return console.log(err)
      }
    })
  })

  it('should have made a new directory for "controllers" based on the given parameters and be a directory', function () {
    const foldertest = path.join(__dirname, '../app/folderTest/mvc/controllersTest')
    let test = fs.existsSync(foldertest)
    assert.equal(test, true)

    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        return console.log(err)
      }
    })
  })

  it('should have made a new directory for "staticsRoot" based on the given parameters and be a directory', function () {
    const foldertest = path.join(__dirname, '../app/folderTest/staticsRootTest')
    let test = fs.existsSync(foldertest)
    assert.equal(test, true)

    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        return console.log(err)
      }
    })
  })

  it('should have made a new directory for "publicFolder" based on the given parameters and be a directory', function () {
    const foldertest = path.join(__dirname, '../app/folderTest/publicFolderTest')
    let test = fs.existsSync(foldertest)
    assert.equal(test, true)

    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        return console.log(err)
      }
    })
  })
})
