/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')
const klawSync = require('klaw-sync')

describe('Folder Tests', function () {
  const appDir = path.join(__dirname, '../app/folderTest')
  let app
  let expectedFolders

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

    let jsSource = app.expressApp.get('params').js.sourceDir.replace('staticsRootTest', '')
    let cssSource = app.expressApp.get('params').css.sourceDir.replace('staticsRootTest', '')

    expectedFolders = [
      path.join(appDir, app.expressApp.get('params').viewsPath),
      path.join(appDir, app.expressApp.get('params').modelsPath),
      path.join(appDir, app.expressApp.get('params').controllersPath),
      path.join(appDir, app.expressApp.get('params').staticsRoot),
      path.join(appDir, app.expressApp.get('params').publicFolder),
      path.join(appDir, app.expressApp.get('params').js.sourceDir),
      path.join(appDir, app.expressApp.get('params').css.sourceDir),
      path.join(appDir, '/mvc'),
      path.join(appDir, '/staticsRootTest/images'),
      path.join(appDir, app.expressApp.get('params').publicFolder, 'css'),
      path.join(appDir, app.expressApp.get('params').publicFolder, 'js'),
      path.join(appDir, app.expressApp.get('params').publicFolder, 'images'),
      path.join(appDir, app.expressApp.get('params').publicFolder, jsSource),
      path.join(appDir, app.expressApp.get('params').publicFolder, cssSource)
    ]

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
    const foldertest = path.join(appDir, app.expressApp.get('params').viewsPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "modelsPath" directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').modelsPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "controllersPath" directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').controllersPath)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "staticsRoot" directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').staticsRoot)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "publicFolder" directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').publicFolder)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "js" source directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').js.sourceDir)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should generate "css" source directory', function (done) {
    const foldertest = path.join(appDir, app.expressApp.get('params').css.sourceDir)
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        done()
      }
    })
  })

  it('should not generate extra directories into the appDir', function () {
    const dirs = klawSync(appDir)
    dirs.forEach((dir) => {
      let test = expectedFolders.includes(dir.path)
      assert.equal(test, true, `There is an extra directory at ${dir.path}`)
    })
  })
})
