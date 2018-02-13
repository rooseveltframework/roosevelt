/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const klawSync = require('klaw-sync')
const request = require('supertest')

describe('Public folder section tests', function () {
  // path to the directory where the test app is located
  const appDir = path.join(__dirname, '../', 'app', 'publicFolderTest')
  // options to pass into generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  // package.json source code
  let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fse.copySync(path.join(__dirname, '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
    done()
  })

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should be able to send a web page back with no problem with favicon set to something', function (done) {
    // copy the favicon to the images folder within the static folder
    fse.copySync(path.join(__dirname, '../', 'util', 'faviconTest.ico'), path.join(appDir, 'statics', 'images', 'faviconTest.ico'))

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      favicon: 'images/faviconTest.ico'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when we get back the message that the server has started, send a request to the server
    testApp.on('message', () => {
      request('http://localhost:43711')
      .get('/HTMLTest')
      .expect(200, (err, res) => {
        if (err) {
          assert.fail(err)
          testApp.kill('SIGINT')
        }
        testApp.kill('SIGINT')
      })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('change the name of the public folder to what version number the app is on in the package.json file', function (done) {
    // write the package json file with the source code from above
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      versionedPublic: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the server message back on start up, look for if the public file was changed to the version number
    testApp.on('message', () => {
      // var to keep track of whether or not the public folder name was changed to the version number
      let publicNameChange = false
      // get the what is in the app folder
      const dirs = klawSync(path.join(appDir, 'public'), {nofile: true})
      dirs.forEach((dir) => {
        if (dir.path.includes('0.5.1')) {
          publicNameChange = true
        }
      })
      if (publicNameChange) {
        testApp.kill('SIGINT')
      } else {
        assert.fail('public folder name was not changed to version number')
        testApp.kill('SIGINT')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow the user to name the symlink files in the public folder', function (done) {
    // array that holds all the changed names for the symlinks
    const symlinkChangedNameArray = [
      path.join(appDir, 'public', 'cssTest'),
      path.join(appDir, 'public', 'imagesTest'),
      path.join(appDir, 'public', 'jsTest')]

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: true,
      staticsSymlinksToPublic: [
        'cssTest: .build/css',
        'imagesTest: images',
        'jsTest: .build/js'
      ],
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify'
        }
      },
      css: {
        compiler: {
          nodeModule: 'roosevelt-less'
        }
      }
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app starts up, look into the public folder and see if the names of the symlinks were changed
    testApp.on('message', () => {
      // klawsync the public folder
      const files = klawSync(path.join(appDir, 'public'))
      // look to see that all the files are there
      files.forEach((file) => {
        let test = symlinkChangedNameArray.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })
})
