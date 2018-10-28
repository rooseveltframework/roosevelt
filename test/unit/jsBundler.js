/* eslint-env mocha */

const assert = require('assert')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

// mocks
const mockBrowserify = require('../util/mocks/browserify.mock')
const mockPath = require('../util/mocks/path.mock')
const mockLogger = require('../util/mocks/tools/logger.mock')
const mockFsr = require('../util/mocks/tools/fsr.mock')

// fakes
const fakeParams = require('../util/mocks/app/get/params.fake')

describe('lib/jsBundler', function () {
  var fakeGetMap
  var fakeApp
  var fakeCallback
  var jsBundler
  var mocks

  beforeEach(function () {
    mocks = {
      'browserify': mockBrowserify(),
      'path': mockPath(),
      'logger': mockLogger(),
      'fsr': mockFsr()
    }

    fakeGetMap = {
      params: fakeParams().singleJsBundle(),
      appDir: {},
      appName: {},
      jsPath: 'jsPath',
      jsBundledOutput: '',
      jsCompiledOutput: 'jsCompiledOutput'
    }

    fakeApp = {
      get: sinon.stub().callsFake(function (key) {
        return fakeGetMap[key]
      })
    }
    fakeCallback = sinon.stub()

    jsBundler = proxyquire('../../lib/jsBundler', {
      'browserify': mocks.browserify,
      'path': mocks.path,
      './tools/logger': mocks.logger,
      './tools/fsr': mocks.fsr
    })

    sinon.stub(jsBundler, 'computeBuildPath').returns('computeBuildPathResult')
    sinon.stub(jsBundler, 'isBundlerEnabled').returns(true)
    sinon.stub(jsBundler, 'isDev').returns(true)

    sinon.spy(jsBundler, 'checkOutputDir')
    sinon.spy(jsBundler, 'checkBuildDir')
  })

  describe('.bundle', function () {
    describe('when bundler is disabled', function () {
      beforeEach(function () {
        jsBundler.isBundlerEnabled.returns(false)
        jsBundler.bundle(fakeApp, fakeCallback)
      })

      it('should call the provided callback', function () {
        assert(fakeCallback.called, 'callback was not called')
      })

      it('should not continue with the operation', function () {
        assert(!jsBundler.checkOutputDir.called, 'checkOutputDir was called')
        assert(!jsBundler.checkBuildDir.called, 'checkBuildDir was called')
        assert(!jsBundler.isDev.called, 'isDev was called')
      })
    })

    describe('when bundler is enabled', function () {
      it('should check the output directory', function () {
        jsBundler.bundle(fakeApp, fakeCallback)

        const expectedArgs = [
          jsBundler.fsr, // fsr
          jsBundler.logger, // logger
          fakeGetMap.appName, // appName
          fakeGetMap.jsBundledOutput // jsBundledOutput
        ]

        assert(jsBundler.checkOutputDir.called, 'was not called')
        assert(jsBundler.checkOutputDir.calledWith(...expectedArgs), 'was called with unexpected args')
      })

      it('should check the build directory', function () {
        jsBundler.bundle(fakeApp, fakeCallback)

        const expectedArgs = [
          jsBundler.fsr, // fsr
          jsBundler.logger, // logger
          fakeGetMap.appName, // appName
          'computeBuildPathResult', // bundleBuildDir
          fakeGetMap.params // params
        ]

        assert(jsBundler.checkBuildDir.called, 'was not called')
        assert(jsBundler.checkBuildDir.calledWith(...expectedArgs), 'was called with unexpected args')
      })
    })
  })

  describe('.computeBuildPath', function () {
    beforeEach(function () {
      jsBundler.computeBuildPath.restore()
    })

    it('should return a build path', function () {
      const result = jsBundler.computeBuildPath(fakeApp, jsBundler.path, 'jsPath/jsBundledOutput')

      const expectedArgs = [
        fakeGetMap.jsCompiledOutput,
        '/jsBundledOutput'
      ]

      assert(jsBundler.path.join.calledWith(...expectedArgs), 'path.join was called with unexpected args')
      assert.strict.equal(result, 'path.join result')
    })
  })

  describe('.isBundlerEnabled', function () {
    beforeEach(function () {
      jsBundler.isBundlerEnabled.restore()
    })

    it('should return true when params.js.bundler.bundles.length has a nonzero length', function () {
      const result = jsBundler.isBundlerEnabled(fakeParams().singleJsBundle())
      assert.strict.equal(result, true, 'expected return value to be true')
    })

    it('should return false when params.js.bundler.bundles.length has a zero length', function () {
      const result = jsBundler.isBundlerEnabled(fakeParams().emptyJsBundle())
      assert.strict.equal(result, false, 'expected return value to be false')
    })
  })

  describe('.checkOutputDir', function () {
    let fsr
    let logger

    beforeEach(function () {
      jsBundler.checkOutputDir.restore()
      fsr = mocks.fsr(fakeApp)
      logger = mocks.logger(fakeGetMap.params.logging)
    })

    describe('when the output directory exists', function () {
      it('should do nothing', function () {
        fsr.fileExists.returns(true)
        jsBundler.checkOutputDir(fsr, logger, 'appName', 'jsBundledOutput')

        assert(fsr.fileExists.called, 'fileExists was not called')
        assert(fsr.fileExists.calledWith('jsBundledOutput'), 'fileExists was called with incorrect args')
        assert(!fsr.ensureDirSync.called, 'ensureDirSync was called')
        assert(!logger.log.called, 'log was called')
      })
    })

    describe('when the output directory does not exist', function () {
      it('should make the directory, and log the result (assumes success)', function () {
        fsr.fileExists.returns(false)
        fsr.ensureDirSync.returns('jsBundledOutput/path')
        jsBundler.checkOutputDir(fsr, logger, 'appName', 'jsBundledOutput')

        const expectedLogArgs = [
          '📁',
          'appName making new directory jsBundledOutput'.yellow
        ]

        assert(fsr.fileExists.called, 'fileExists was not called')
        assert(fsr.fileExists.calledWith('jsBundledOutput'), 'fileExists was called with incorrect args')
        assert(fsr.ensureDirSync.called, 'ensureDirSync was not called')
        assert(fsr.ensureDirSync.calledWith('jsBundledOutput'), 'ensureDirSync was called with incorrect args')
        assert(logger.log.called, 'log was not called')
        assert(logger.log.calledWith(...expectedLogArgs), 'log was called with incorrect args')
      })
    })
  })

  describe('.checkBuildDir', function () {
    let fsr
    let logger
    let params

    beforeEach(function () {
      jsBundler.checkOutputDir.restore()
      fsr = mocks.fsr(fakeApp)
      logger = mocks.logger(fakeGetMap.params.logging)
      params = fakeGetMap.params
    })

    describe('when expose is false', function () {
      beforeEach(function () {
        params.js.bundler.expose = false
      })

      it('should do nothing if the directory exists', function () {
        fsr.fileExists.returns(true)
        jsBundler.checkBuildDir(fsr, logger, 'appName', 'bundleBuildDir', fakeGetMap.params)

        assert(!fsr.fileExists.called, 'fileExists was called')
        assert(!fsr.ensureDirSync.called, 'ensureDirSync was called')
        assert(!logger.log.called, 'log was called')
      })
    })

    describe('when expose is true', function () {
      beforeEach(function () {
        params.js.bundler.expose = true
      })

      it('should do nothing if the directory exists', function () {
        fsr.fileExists.returns(true)
        jsBundler.checkBuildDir(fsr, logger, 'appName', 'bundleBuildDir', fakeGetMap.params)

        assert(fsr.fileExists.called, 'fileExists was not called')
        assert(fsr.fileExists.calledWith('bundleBuildDir'), 'fileExists was called with incorrect args')
        assert(!fsr.ensureDirSync.called, 'ensureDirSync was called')
        assert(!logger.log.called, 'log was called')
      })

      it('should make the directory, and log the result (assumes success)', function () {
        fsr.fileExists.returns(false)
        fsr.ensureDirSync.returns('bundleBuildDir/path')
        jsBundler.checkBuildDir(fsr, logger, 'appName', 'bundleBuildDir', fakeGetMap.params)

        const expectedLogArgs = [
          '📁',
          'appName making new directory bundleBuildDir'.yellow
        ]

        assert(fsr.fileExists.called, 'fileExists was not called')
        assert(fsr.fileExists.calledWith('bundleBuildDir'), 'fileExists was called with incorrect args')
        assert(fsr.ensureDirSync.called, 'ensureDirSync was not called')
        assert(fsr.ensureDirSync.calledWith('bundleBuildDir'), 'ensureDirSync was called with incorrect args')
        assert(logger.log.called, 'log was not called')
        assert(logger.log.calledWith(...expectedLogArgs), 'log was called with incorrect args')
      })
    })
  })

  describe('.isDev', function () {
    let proc

    beforeEach(function () {
      jsBundler.isDev.restore()
      proc = { env: { NODE_ENV: '' } }
    })

    it('should return true in development environment', function () {
      proc.env.NODE_ENV = 'development'
      const result = jsBundler.isDev(proc)

      assert.strict.equal(result, true, 'isDev is incorrect')
    })

    it('should return false in any other environment', function () {
      proc.env.NODE_ENV = 'notDev'
      const result = jsBundler.isDev(proc)

      assert.strict.equal(result, false, 'isDev is incorrect')
    })
  })

  it('should run jsBundler in an isolated form', function () {
    jsBundler.bundle(fakeApp, fakeCallback)
  })
})
