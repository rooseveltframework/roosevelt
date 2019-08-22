/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fs = require('fs')
const fse = require('fs-extra')
const klaw = require('klaw')
const path = require('path')

describe('Folder Structure Tests', function () {
  // set the test app directory
  const appDir = path.join(__dirname, '../app/folderStructureTest')
  let app
  let expectedFolders

  // initialize the test-app
  before(function () {
    fse.ensureDirSync(path.join(appDir))

    app = require('../../roosevelt')({
      appDir: appDir,
      enableCLIFlags: false,
      generateFolderStructure: true,
      logging: {
        methods: {
          info: false,
          warn: false
        }
      },
      viewsPath: 'mvc/viewsTest',
      modelsPath: 'mvc/modelsTest',
      controllersPath: 'mvc/controllersTest',
      staticsRoot: 'staticsRootTest',
      publicFolder: 'publicFolderTest',
      js: {
        sourcePath: 'jsTest'
      },
      css: {
        sourcePath: 'cssTest'
      },
      staticsSymlinksToPublic: [
        'images',
        'jsTest'
      ]
    })

    expectedFolders = [
      appDir,
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

  // clean up the test app directory after the tests
  after(function (done) {
    cleanupTestApp(appDir, (err) => {
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
        assert.strictEqual(stats.isDirectory(), true, 'viewsPath was not made into a directory successfully')
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
        assert.strictEqual(stats.isDirectory(), true, '"modelsPath" was not made into a directory successfully')
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
        assert.strictEqual(stats.isDirectory(), true, '"controllersPath" was not made into a directory successfully')
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
        assert.strictEqual(stats.isDirectory(), true, '"staticsPath" was not made into a directory successfully')
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
        assert.strictEqual(stats.isDirectory(), true, '"PublicFolder" was not made into a directory successfully')
        done()
      }
    })
  })

  it('should generate "js" source directory', function (done) {
    const foldertest = path.join(app.expressApp.get('jsPath'))
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.strictEqual(stats.isDirectory(), true, '"js source directory" was not made into a directory successfully')
        done()
      }
    })
  })

  it('should generate "css" source directory', function (done) {
    const foldertest = path.join(app.expressApp.get('cssPath'))
    fs.lstat(foldertest, (err, stats) => {
      if (err) {
        done(err)
      } else {
        assert.strictEqual(stats.isDirectory(), true, '"css source directory" was not made into a directory successfully')
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
        assert.strictEqual(stats.isDirectory(), true, '"image" was not made into a directory successfully')
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
        assert.strictEqual(stats.isSymbolicLink(), true, '"image" was not made into a symlink successfully')
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
        assert.strictEqual(stats.isSymbolicLink(), true, '"jsTest" was not made into a symlink successfully')
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
        assert.strictEqual(stats.isSymbolicLink(), true, '"cssTest" was not made into a symlink successfully')
        done()
      }
    })
  })

  it('should set "cssPath" express variable to absolute path of "css.sourcePath"', function () {
    const folderCheck = path.join(appDir, app.expressApp.get('params').staticsRoot, app.expressApp.get('params').css.sourcePath)
    const test = folderCheck === app.expressApp.get('cssPath')
    assert.strictEqual(test, true, 'the path given by the combined paths and the path given by cssPath do not match')
  })

  it('should set "jsPath" express variable to absolute path of "js.sourcePath"', function () {
    const folderCheck = path.join(appDir, app.expressApp.get('params').staticsRoot, app.expressApp.get('params').js.sourcePath)
    const test = folderCheck === app.expressApp.get('jsPath')
    assert.strictEqual(test, true, 'the path given by the combined paths and the path given by jsPath do not match')
  })

  it('should not generate extra directories or files into the appDir', function (done) {
    const dirs = []
    let item
    klaw(appDir, { depthLimit: 1, preserveSymlinks: true })
      .on('readable', function () {
        while ((item = this.read())) {
          dirs.push(item)
        }
      })
      .on('end', () => {
        dirs.forEach((dir) => {
          if (!dir.path.includes('.DS_Store')) {
            const test = expectedFolders.includes(dir.path)
            assert.strictEqual(test, true, `There is an extra directory or file at ${dir.path}`)
          }
        })
        done()
      })
      .on('error', (err) => {
        console.error(err)
      })
  })
})
