/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')
const fork = require('child_process').fork

describe('Command Line Tests', function () {
  const appDir = path.join(__dirname, '../app/commandLineTest')

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    let dataIn = `const path = require('path')
    const appDir = path.join(__dirname, '../app/commandLineTest')
    const app = require('../../../roosevelt')({
      appDir: appDir,
      generateFolderStructure: false,
    })
    if (process.send) {
      process.send(app.expressApp.get('params'))
    }

    process.exit()
    `

    fs.writeFileSync(path.join(appDir, 'app.js'), dataIn)
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

  /* checking soon to be deprecated flags */

  it('should change the app to development mode ("-dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to production mode ("-prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to enable validator ("enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to disable validator ("disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to detach the html Validator ("detach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['detach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to attach the html Validator ("attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  /* check individual flags */

  it('should change the app to development mode ("--dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to development mode ("-development-mode")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-development-mode'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to development mode ("-d")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-d'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to production mode ("--production-mode")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to production mode ("--prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to production mode ("-p")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-p'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to enable validator ("--enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to enable validator ("--html-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--html-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to enable validator ("-h")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-h'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to disable validator ("--disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to disable validator ("--raw")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--raw'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to disable validator ("-r")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-r'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to detach the html Validator ("--background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to detach the html Validator ("-b")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-b'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to attach the html Validator ("--attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to attach the html Validator ("-a")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-a'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  /* check combination of flags */

  it('should change the app to put it into dev mode, enable validator, and attach validator ("--development-mode, --enable-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--enable-validator', '--attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      assert.equal(params.htmlValidator.enable, true)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to put it into dev mode, disable validator, and attach validator ("--development-mode, --disable-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--disable-validator', '--attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      assert.equal(params.htmlValidator.enable, false)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to put it into dev mode, disable validator, and detach validator ("--development-mode, --disable-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--disable-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      assert.equal(params.htmlValidator.enable, false)
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to put it into dev mode, enable validator, and detach validator ("--development-mode, --disable-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--enable-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      assert.equal(params.htmlValidator.enable, true)
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to put it into production mode, disable validator, and detach validator ("--production-mode, --disable-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--disable-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      assert.equal(params.htmlValidator.enable, false)
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to put it into production mode, enable validator, and attach validator ("--production-mode, --enable-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--enable-validator', '--attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      assert.equal(params.htmlValidator.enable, true)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to put it into production mode, disable validator, and attach validator ("--production-mode, --disable-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--disable-validator', '--attach-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      assert.equal(params.htmlValidator.enable, false)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to put it into production mode, enable validator, and detach validator ("--production-mode, --enable-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--enable-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      assert.equal(params.htmlValidator.enable, true)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  /* check one letter combinations */

  it('should change the app to put it into dev mode, enable validator, and attach validator ("-dha")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-dha'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      assert.equal(params.htmlValidator.enable, true)
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to put it into production mode, disable validator, and detach validator ("-prb")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-prb'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      assert.equal(params.htmlValidator.enable, false)
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  /* check mutually exclusive flags  */

  it('should change the app to development mode, even with a production flag ("-dev, --prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-dev', '--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to development mode, even with a production flag ("--development-mode, --prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to development mode, even with a production flag ("--dev, --prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev', '--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to development mode, even with a production flag ("-d, -prod")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-d', '--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })

  it('should change the app to production mode, even with a development flag ("-prod, --dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod', '--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to production mode, even with a development flag ("--production-mode, --dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to production mode, even with a development flag ("--prod, --dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod', '--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to production mode, even with a development flag ("-p, --dev")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-p', '--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'production')
      done()
    })
  })

  it('should change the app to enable validator, even with a disable validator flag ("enable-validator, --disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['enable-validator', '--disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to enable validator, even with a disable validator flag ("--enable-validator, --disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--enable-validator', '--disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to enable validator, even with a disable validator flag ("--html-validator, --disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--html-validator', '--disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to enable validator, even with a disable validator flag ("-h, --disable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-h', '--disable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, true)
      done()
    })
  })

  it('should change the app to disable validator, even with a enable validator flag ("disable-validator, --enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['disable-validator', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to disable validator, even with a enable validator flag ("--disable-validator, --enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--disable-validator', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to disable validator, even with a enable validator flag ("--raw, --enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--raw', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to disable validator, even with a enable validator flag ("-r, --enable-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-r', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.enable, false)
      done()
    })
  })

  it('should change the app to detach validator, even with a attach validator flag ("detach-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['detach-validator', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to detach validator, even with a attach validator flag ("--background-validator, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--background-validator', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to detach validator, even with a attach validator flag ("-b, --attach-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-b', '--enable-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, true)
      done()
    })
  })

  it('should change the app to attach validator, even with a detach validator flag ("attach-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['attach-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to attach validator, even with a detach validator flag ("--attach-validator, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--attach-validator', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })

  it('should change the app to attach validator, even with a detach validator flag ("-a, --background-validator")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-a', '--background-validator'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.htmlValidator.separateProcess, false)
      done()
    })
  })
})
