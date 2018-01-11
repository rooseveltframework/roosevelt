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
      },
      staticsSymlinksToPublic: [
        'images',
        'jsTest'
      ]
    })

    expectedFolders = [
      path.join(appDir, '/mvc'),
      path.join(appDir, '/mvc/viewsTest'),
      path.join(appDir, '/mvc/modelsTest'),
      path.join(appDir, '/mvc/controllersTest'),
      path.join(appDir, '/staticsRootTest'),
      path.join(appDir, '/staticsRootTest/jsTest'),
      path.join(appDir, '/staticsRootTest/cssTest'),
      path.join(appDir, '/staticsRootTest/images'),
      path.join(appDir, '/staticsRootTest/.build/js'),
      path.join(appDir, '/staticsRootTest/.build/css'),
      path.join(appDir, '/staticsRootTest/.build'),
      path.join(appDir, '/publicFolderTest'),
      path.join(appDir, '/publicFolderTest/images'),
      path.join(appDir, '/publicFolderTest/jsTest'),
      path.join(appDir, '/publicFolderTest/cssTest')
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
        assert.equal(stats.isDirectory(), true, `viewsPath was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"modelsPath" was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"controllersPath" was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"staticsPath" was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"PublicFolder" was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"js source directory" was not made into a directory successfully`)
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
        assert.equal(stats.isDirectory(), true, `"css source directory" was not made into a directory successfully`)
        done()
      }
    })
  })

  it('should generate the "image" directory that was put in "staticsSymlinksToPublic"', function (done) {
    const foldertest = path.join(appDir, '/staticsRootTest/images')
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.equal(stats.isDirectory(), true, `"image" was not made into a directory successfully`)
        done()
      }
    })
  })

  it('should generate the "image" symlink', function (done) {
    const filetest = path.join(appDir, '/publicFolderTest/images')
    fs.lstat(filetest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.equal(stats.isSymbolicLink(), true, `"image" was not made into a symlink successfully`)
        done()
      }
    })
  })

  it('should generate the "jsTest" symlink', function (done) {
    const filetest = path.join(appDir, '/publicFolderTest/jsTest')
    fs.lstat(filetest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.equal(stats.isSymbolicLink(), true, `"jsTest" was not made into a symlink successfully`)
        done()
      }
    })
  })

  it('should generate the "cssTest" symlink', function (done) {
    const filetest = path.join(appDir, '/publicFolderTest/cssTest')
    fs.lstat(filetest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.equal(stats.isSymbolicLink(), true, `"cssTest" was not made into a symlink successfully`)
        done()
      }
    })
  })

  it('should have the path of cssPath and the path by putting together appDir, staticsRoot param and css.sourceDir param equal', function () {
    const folderCheck = path.join(appDir, app.expressApp.get('params').staticsRoot, app.expressApp.get('params').css.sourceDir)
    const test = folderCheck === app.expressApp.get('cssPath')
    assert.equal(test, true, 'the path given by the combined paths and the path given by cssPath do not match')
  })

  it('should have the path of jsPath and the path by putting together appDir, staticsRoot param and js.sourceDir param equal', function () {
    const folderCheck = path.join(appDir, app.expressApp.get('params').staticsRoot, app.expressApp.get('params').js.sourceDir)
    const test = folderCheck === app.expressApp.get('jsPath')
    assert.equal(test, true, 'the path given by the combined paths and the path given by jsPath do not match')
  })

  it('should not generate extra directories or files into the appDir', function () {
    const dirs = klawSync(appDir)
    dirs.forEach((dir) => {
      let test = expectedFolders.includes(dir.path)
      assert.equal(test, true, `There is an extra directory or file at ${dir.path}`)
    })
  })
})
