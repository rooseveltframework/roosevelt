/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')

describe('Folder Tests', function () {
  const appDir = path.join(__dirname, '../app/folderTest')
  let app

  before(function () {
    fse.ensureDirSync(path.join(appDir))

    app = require('../../roosevelt')({
      appDir: appDir,
      generateFolderStructure: true,
      viewsPath: 'mvc/viewsTest',
      modelsPath: 'mvc/modelsTest',
      controllersPath: 'mvc/controllersTest',
      staticsRoot: 'staticsRootTest',
      publicFolder: 'publicFolderTest',
      js: {
        sourceDir: 'jsTest'
      },
      css: {
        sourceDir: 'cssTest'
      }
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

  it('should generate "viewsPath" directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').viewsPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "modelsPath" directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').modelsPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "controllersPath" directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').controllersPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "staticsRoot" directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').staticsRoot)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "publicFolder" directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').publicFolder)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should not generate extra directories into the appDir', function (done) {
    fs.readdir(appDir, (err, files) => {
      if (err) {
        done(err)
      } else {
        var mvc = files.includes('mvc')
        var publicFolder = files.includes(app.expressApp.get('params').publicFolder)
        var staticsRoot = files.includes(app.expressApp.get('params').staticsRoot)
        assert.equal(files.length, 3)
        assert.equal(mvc, true)
        assert.equal(publicFolder, true)
        assert.equal(staticsRoot, true)
        done()
      }
    })
  })

  it('should generate "js" source directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').js.sourceDir)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "css" source directory', function (done) {
    const foldertest = path.join(__dirname, '../app/folderTest', app.expressApp.get('params').css.sourceDir)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })
})
