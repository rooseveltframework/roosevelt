/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const generateTestApp = require('../util/generateTestApp')
const path = require('path')

describe('Command Line Tests', function () {
  const appDir = path.join(__dirname, '../app/cliFlags')

  let options = { rooseveltPath: '../../../roosevelt', stopServer: true }

  before(function (done) {
    generateTestApp({
      appDir: appDir
    }, options)
    done()
  })

  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  describe('check individual flags', function () {
    it('should change the app to development mode ("--dev")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to development mode ("--development-mode")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to development mode ("-d")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-d'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to production mode ("--production-mode")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to production mode ("--prod")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to production mode ("-p")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-p'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to enable validator in development mode ("--enable-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--enable-validator', '-d'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to enable validator in development mode ("--html-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--html-validator', '-d'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to enable validator in development mode ("-h")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-h', '-d'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to disable validator ("--disable-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--disable-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to disable validator ("--raw")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--raw'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to disable validator ("-r")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-r'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to detach the html Validator ("--background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to detach the html Validator ("-b")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-b'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to attach the html Validator ("--attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--attach-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to attach the html Validator ("-a")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-a'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  it('should force alwaysHostPublic on', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--host-public'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.alwaysHostPublic, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should force alwaysHostPublic on ("--statics")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--statics'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.alwaysHostPublic, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should force alwaysHostPublic on ("-s")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-s'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.alwaysHostPublic, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to enable autokiller ("--enable-validator-autokiller")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--enable-validator-autokiller'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to enable the html Validator autokiller ("--html-validator-autokiller")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--html-validator-autokiller'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to enable the html Validator autokiller ("-k")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-k'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to disable validator ("--disable-validator-autokiller")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--disable-validator-autokiller'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, false)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to disable validator ("--no-autokiller")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--no-autokiller'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, false)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the app to disable the html Validator autokiller ("-n")', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['-n'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', params => {
      assert.strictEqual(params.htmlValidator.separateProcess.autoKiller, false)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  describe('check combination of flags', function () {
    it('should change the app to put it into dev mode, enable validator, and attach validator ("--development-mode, --enable-validator, --attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--enable-validator', '--attach-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, disable validator, and attach validator ("--development-mode, --disable-validator, --attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--disable-validator', '--attach-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, disable validator, and detach validator ("--development-mode, --disable-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--disable-validator', '--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, enable validator, and detach validator ("--development-mode, --disable-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--enable-validator', '--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, disable validator, and detach validator ("--production-mode, --disable-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--disable-validator', '--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, should not enable validator, and attach validator ("--production-mode, --enable-validator, --attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--enable-validator', '--attach-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, disable validator, and attach validator ("--production-mode, --disable-validator, --attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--disable-validator', '--attach-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, should not enable validator, and detach validator ("--production-mode, --enable-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--enable-validator', '--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode and should not enable validator ("--production-mode, --enable-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--production-mode', '--enable-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  describe('check one letter combinations', function () {
    it('should change the app to put it into dev mode, enable validator, and attach validator ("-dha")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-dha'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, enable validator, and attach validator ("-had")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-had'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, disable validator, and attach validator ("-rda")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-rda'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, enable validator, and detach validator ("-dbh")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-dbh'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into dev mode, disable validator, and detach validator ("-brd")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-brd'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, disable validator, and detach validator ("-prb")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-prb'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, disable validator, and detach validator ("-rbp")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-rbp'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, should not enable validator, and detach validator ("-bhp")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-bhp'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, should not enable validator, and attach validator ("-hpa")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-hpa'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to put it into production mode, disable validator, and attach validator ("-par")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-par'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        assert.strictEqual(params.htmlValidator.enable, false)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  describe('check mutually exclusive flags', function () {
    it('should change the app to development mode, even with a production flag ("--development-mode, --prod")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode', '--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to production mode, even with a development flag ("--prod, --dev")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--prod', '--dev'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to enable validator, even with a disable validator flag in development mode ("--enable-validator, --disable-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--enable-validator', '--disable-validator', '-d'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to disable validator, even with a enable validator flag ("--disable-validator, --enable-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--disable-validator', '--enable-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to detach validator, even with a attach validator flag ("--background-validator, --attach-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--background-validator', '--enable-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.separateProcess.enable, true)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to attach validator, even with a detach validator flag ("--attach-validator, --background-validator")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['--attach-validator', '--background-validator'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })

    it('should change the app to go into dev mode, enable the validator and attach the validator, even though the opposite flags are there too ("-dpabhr")', function (done) {
      const testApp = fork(path.join(appDir, 'app.js'), ['-dpabhr'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'development')
        assert.strictEqual(params.htmlValidator.enable, true)
        assert.strictEqual(params.htmlValidator.separateProcess.enable, false)
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })

  describe('CLI special cases', function () {
    const appDir = path.join(__dirname, '../app/cliSpecial')
    let options = { rooseveltPath: '../../../roosevelt', stopServer: true }

    afterEach(function (done) {
      cleanupTestApp(appDir, (err) => {
        if (err) {
          throw err
        } else {
          done()
        }
      })
    })

    it('should ignore parsing CLI flags when "enableCLIFlags" param is false', function (done) {
      generateTestApp({
        appDir: appDir,
        enableCLIFlags: false
      }, options)

      const testApp = fork(path.join(appDir, 'app.js'), ['--development-mode'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

      testApp.on('message', params => {
        assert.strictEqual(params['_env'], 'production')
        testApp.send('stop')
      })

      testApp.on('exit', () => {
        done()
      })
    })
  })
})
