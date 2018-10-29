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
      params: fakeParams().multiJsBundle(),
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

    sinon.stub(jsBundler, 'checkOutputDir')
    sinon.stub(jsBundler, 'checkBuildDir')

    sinon.stub(jsBundler, 'shouldIncludeBundle').returns(true)
    sinon.stub(jsBundler, 'processBundle').returns(new Promise((resolve, reject) => { resolve() }))

    sinon.stub(jsBundler, 'conclude')
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
        assert(!jsBundler.shouldIncludeBundle.called, 'shouldIncludeBundle was called')
        assert(!jsBundler.processBundle.called, 'processBundle was called')
        assert(!jsBundler.conclude.called, 'conclude was called')
      })
    })

    describe('when bundler is enabled', function () {
      it('should check the output directory', function () {
        jsBundler.bundle(fakeApp, fakeCallback)

        const expectedArgs = [
          fakeGetMap.appName, // appName
          fakeGetMap.jsBundledOutput // jsBundledOutput
        ]

        assert(jsBundler.checkOutputDir.called, 'was not called')
        assert(jsBundler.checkOutputDir.calledWith(...expectedArgs), 'was called with unexpected args')
      })

      it('should check the build directory', function () {
        jsBundler.bundle(fakeApp, fakeCallback)

        const expectedArgs = [
          fakeGetMap.appName, // appName
          'computeBuildPathResult', // bundleBuildDir
          fakeGetMap.params // params
        ]

        assert(jsBundler.checkBuildDir.called, 'was not called')
        assert(jsBundler.checkBuildDir.calledWith(...expectedArgs), 'was called with unexpected args')
      })

      it('should check each bundle for inclusion', function () {
        jsBundler.bundle(fakeApp, fakeCallback)

        assert.strict.equal(jsBundler.shouldIncludeBundle.callCount, 2, 'was called an incorrect number of times')
        assert(jsBundler.shouldIncludeBundle.calledWith(process, fakeGetMap.params.js.bundler.bundles[0]), 'was not called with the first bundle')
        assert(jsBundler.shouldIncludeBundle.calledWith(process, fakeGetMap.params.js.bundler.bundles[1]), 'was not called with the second bundle')
      })

      describe('when the bundle should be included', function () {
        beforeEach(function () {
          jsBundler.shouldIncludeBundle.returns(true)
          jsBundler.bundle(fakeApp, fakeCallback)
        })

        it('should process the bundle', function () {
          assert(jsBundler.processBundle.calledWith(fakeGetMap.params.js.bundler.bundles[0]), 'was not called with the first bundle')
          assert(jsBundler.processBundle.calledWith(fakeGetMap.params.js.bundler.bundles[1]), 'was not called with the second bundle')
        })

        it('should call conclude with the proper number of promises', function () {
          const promiseLength = jsBundler.conclude.getCall(0).args[1].length
          assert.strict.equal(promiseLength, 2, 'there are the wrong amount of promises')
        })
      })

      describe('when the bundle should be omitted', function () {
        beforeEach(function () {
          jsBundler.shouldIncludeBundle.returns(false)
          jsBundler.bundle(fakeApp, fakeCallback)
        })

        it('should not process the bundle', function () {
          assert(!jsBundler.processBundle.called, 'processBundle was called')
        })

        it('should call conclude with the proper number of promises', function () {
          const promiseLength = jsBundler.conclude.getCall(0).args[1].length
          assert.strict.equal(promiseLength, 0, 'there are the wrong amount of promises')
        })
      })
    })
  })

  describe('.computeBuildPath', function () {
    beforeEach(function () {
      jsBundler.computeBuildPath.restore()
    })

    it('should return a build path', function () {
      const result = jsBundler.computeBuildPath(fakeApp, 'jsPath/jsBundledOutput')

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
      const result = jsBundler.isBundlerEnabled(fakeParams().multiJsBundle())
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
      fsr = jsBundler.fsr = mocks.fsr(fakeApp)
      logger = jsBundler.logger = mocks.logger(fakeGetMap.params.logging)
    })

    describe('when the output directory exists', function () {
      it('should do nothing', function () {
        fsr.fileExists.returns(true)
        jsBundler.checkOutputDir('appName', 'jsBundledOutput')

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
        jsBundler.checkOutputDir('appName', 'jsBundledOutput')

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
      jsBundler.checkBuildDir.restore()
      fsr = jsBundler.fsr = mocks.fsr(fakeApp)
      logger = jsBundler.logger = mocks.logger(fakeGetMap.params.logging)
      params = fakeGetMap.params
    })

    describe('when expose is false', function () {
      beforeEach(function () {
        params.js.bundler.expose = false
      })

      it('should do nothing, even if the directory exists', function () {
        fsr.fileExists.returns(true)
        jsBundler.checkBuildDir('appName', 'bundleBuildDir', params)

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
        jsBundler.checkBuildDir('appName', 'bundleBuildDir', params)

        assert(fsr.fileExists.called, 'fileExists was not called')
        assert(fsr.fileExists.calledWith('bundleBuildDir'), 'fileExists was called with incorrect args')
        assert(!fsr.ensureDirSync.called, 'ensureDirSync was called')
        assert(!logger.log.called, 'log was called')
      })

      it('should make the directory, and log the result (assumes success)', function () {
        fsr.fileExists.returns(false)
        fsr.ensureDirSync.returns('bundleBuildDir/path')
        jsBundler.checkBuildDir('appName', 'bundleBuildDir', params)

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

  describe('.shouldIncludeBundle', function () {
    let proc

    beforeEach(function () {
      jsBundler.shouldIncludeBundle.restore()
    })

    describe('during a dev build', function () {
      beforeEach(function () {
        proc = { env: { NODE_ENV: 'development' } }
      })

      it('should return true for a dev bundle', function () {
        const bundle = { env: 'dev' }
        const result = jsBundler.shouldIncludeBundle(proc, bundle)

        assert(result, 'should not return false for a dev bundle')
      })

      it('should return true for a non-dev bundle', function () {
        const bundle = { }
        const result = jsBundler.shouldIncludeBundle(proc, bundle)

        assert(result, 'should not return false for a non-dev bundle')
      })
    })

    describe('during a prod build', function () {
      beforeEach(function () {
        proc = { env: { NODE_ENV: 'production' } }
      })

      it('should return false for a dev bundle', function () {
        const bundle = { env: 'dev' }
        const result = jsBundler.shouldIncludeBundle(proc, bundle)

        assert(!result, 'should not return true for a dev bundle')
      })

      it('should return true for a non-dev bundle', function () {
        const bundle = { }
        const result = jsBundler.shouldIncludeBundle(proc, bundle)

        assert(result, 'should not return false for a non-dev bundle')
      })
    })
  })

  describe('.processBundle', function () {
    let bundle

    beforeEach(function () {
      jsBundler.processBundle.restore()
      sinon.stub(jsBundler, 'processBundleFiles')
      sinon.spy(jsBundler, 'browserify')
      sinon.stub(jsBundler, 'handleBrowserifyResult')
      bundle = fakeGetMap.params.js.bundler.bundles[0]
    })

    it('should preprocess the bundle files', function () {
      jsBundler.processBundle(bundle)
      assert(jsBundler.processBundleFiles.called, 'processBundleFiles was not called')
      assert(jsBundler.processBundleFiles.calledWith(bundle), 'processBundleFiles was called with incorrect args')
    })

    it('should run browserify with the bundle', function () {
      jsBundler.processBundle(bundle)
      assert(jsBundler.browserify.called, 'browserify was not called')
      assert(jsBundler.browserify.calledWith(bundle.files, bundle.params), 'browserify was called with incorrect args')
    })

    it('should run browserify.bundle with a function', function () {
      jsBundler.processBundle(bundle)
      const bundleStub = jsBundler.browserify.getCall(0).returnValue.bundle
      assert(bundleStub.called, 'browserify.bundle was not called')
      assert(bundleStub.calledWith(sinon.match.func), 'browserify was called with incorrect args')
    })

    it('should handle the browserify result', function () {
      jsBundler.processBundle(bundle)
      const jsCode = 'var foo = 1'
      const err = false
      const bundleStub = jsBundler.browserify.getCall(0).returnValue.bundle
      bundleStub.getCall(0).args[0](err, jsCode)

      const expectedArgs = [
        bundle,
        err,
        jsCode,
        sinon.match.func,
        sinon.match.func
      ]

      assert(jsBundler.handleBrowserifyResult.called, 'handleBrowserifyResult was not called')
      assert(jsBundler.handleBrowserifyResult.calledWith(...expectedArgs), 'handleBrowserifyResult was called with incorrect args')
    })

    it('should return a promise that can resolve', function () {
      const promise = jsBundler.processBundle(bundle)
        .then(() => { assert.ok('this is where we intended to be') })
        .catch(() => { assert.fail('this promise should not have rejected') })

      const jsCode = 'var foo = 1'
      const err = false
      const bundleStub = jsBundler.browserify.getCall(0).returnValue.bundle
      bundleStub.getCall(0).args[0](err, jsCode)

      jsBundler.handleBrowserifyResult.getCall(0).args[3]()

      return promise
    })

    it('should return a promise that can reject', function () {
      const promise = jsBundler.processBundle(bundle)
        .then(() => { assert.fail('this promise should not have resolved') })
        .catch(() => { assert.ok('this is where we intended to be') })

      const jsCode = 'var foo = 1'
      const err = false
      const bundleStub = jsBundler.browserify.getCall(0).returnValue.bundle
      bundleStub.getCall(0).args[0](err, jsCode)

      jsBundler.handleBrowserifyResult.getCall(0).args[4]()

      return promise
    })
  })

  describe('.processBundleFiles', function () {
    let bundle

    beforeEach(function () {
      bundle = {
        files: ['a.js', 'b.js', 'c.js'],
        params: {
          paths: ['/a/', '/b/', '/c/']
        }
      }
      jsBundler.appDir = 'appDir'
      jsBundler.jsPath = 'jsPath/'
      jsBundler.path.join.onCall(0).returns('result 1')
      jsBundler.path.join.onCall(1).returns('result 2')
      jsBundler.path.join.onCall(2).returns('result 3')
      jsBundler.path.join.onCall(3).returns('result 4')
      jsBundler.path.join.onCall(4).returns('result 5')
      jsBundler.path.join.onCall(5).returns('result 6')
    })

    it('should pathify the bundle\'s files', function () {
      jsBundler.processBundleFiles(bundle)

      assert(jsBundler.path.join.calledWith('jsPath/', 'a.js'), 'path.join was not used with this file')
      assert(jsBundler.path.join.calledWith('jsPath/', 'b.js'), 'path.join was not used with this file')
      assert(jsBundler.path.join.calledWith('jsPath/', 'c.js'), 'path.join was not used with this file')
      assert.strict.equal(bundle.files[0], 'result 1', 'the file path was not constructed properly')
      assert.strict.equal(bundle.files[1], 'result 2', 'the file path was not constructed properly')
      assert.strict.equal(bundle.files[2], 'result 3', 'the file path was not constructed properly')
    })

    it('should pathify the bundle\'s paths', function () {
      jsBundler.processBundleFiles(bundle)

      assert(jsBundler.path.join.calledWith('appDir', '/a/'), 'path.join was not used with this file')
      assert(jsBundler.path.join.calledWith('appDir', '/b/'), 'path.join was not used with this file')
      assert(jsBundler.path.join.calledWith('appDir', '/c/'), 'path.join was not used with this file')
      assert.strict.equal(bundle.params.paths[0], 'result 4', 'the file path was not constructed properly')
      assert.strict.equal(bundle.params.paths[1], 'result 5', 'the file path was not constructed properly')
      assert.strict.equal(bundle.params.paths[2], 'result 6', 'the file path was not constructed properly')
    })

    it('should provide a default path if the bundle has no params', function () {
      delete bundle.params
      jsBundler.processBundleFiles(bundle)

      assert.strict.equal(bundle.params.paths[0], 'jsPath/', 'the default paths behavior is incorrect')
      assert.strict.equal(bundle.params.paths.length, 1, 'there are too many paths')
    })
  })

  describe('handleBrowserifyResult', function () {
    let resolve
    let reject
    let fsr
    let logger
    let path
    let bundle
    let err
    let jsCode

    beforeEach(function () {
      resolve = sinon.stub()
      reject = sinon.stub()
      fsr = jsBundler.fsr = mocks.fsr(fakeApp)
      logger = jsBundler.logger = mocks.logger(fakeGetMap.params.logging)
      path = jsBundler.path

      jsBundler.appName = 'appName'
      jsBundler.jsBundledOutput = 'jsBundledOutput'
      jsBundler.params = fakeGetMap.params

      jsBundler.path.join.onCall(0).returns('result 1')
      jsBundler.path.join.onCall(1).returns('result 2')
      jsBundler.path.join.onCall(2).returns('result 3')
      jsBundler.path.join.onCall(3).returns('result 4')
      jsBundler.path.join.onCall(4).returns('result 5')

      fsr.writeFileSync.returns(true)

      bundle = { outputFile: 'outputFile' }
      jsCode = 'var foo = 1'
      err = null
    })

    describe('when there is an error', function () {
      beforeEach(function () {
        err = 'An error'
        jsBundler.handleBrowserifyResult(bundle, err, jsCode, resolve, reject)
      })

      it('should log an error message', function () {
        const errorArg = `${jsBundler.appName} failed to write new JS file ${
          'result 1'
        } due to syntax errors in the source JavaScript`.red
        const joinArgs = [
          jsBundler.jsBundledOutput,
          bundle.outputFile
        ]
        assert(logger.error.called, 'it should have called logger.error')
        assert(logger.error.calledWith(errorArg), 'logger.error called with incorrect args')
        assert(path.join.calledWith(...joinArgs), 'path.join called with incorrect args')
      })

      it('should reject the promise', function () {
        assert(reject.called, 'reject was not called')
        assert(reject.calledWith(err), 'reject was called with incorrect args')
      })

      it('should should not continue with the operation', function () {
        assert(!fsr.writeFileSync.called, 'writeFileSync should not have been called')
        assert(!logger.log.called, 'log should not have been called')
        assert(!resolve.called, 'resolve should not have been called')
      })
    })
    describe('when there is no error', function () {
      describe('when expose is false', function () {
        beforeEach(function () {
          fakeGetMap.params.js.bundler.expose = false
          jsBundler.handleBrowserifyResult(bundle, err, jsCode, resolve, reject)
        })

        it('should write to the output dir and log', function () {
          const joinArgs = [
            jsBundler.jsBundledOutput,
            bundle.outputFile
          ]
          const outputArgs = [
            'result 1',
            jsCode,
            'utf8'
          ]
          const loggerArgs = [
            '📝',
            `${jsBundler.appName} writing new JS file result 2`.green
          ]
          assert(path.join.calledWith(...joinArgs), 'path.join was called with incorrect args')
          assert(fsr.writeFileSync.calledWith(...outputArgs), 'writeFileSync was called with incorrect args')
          assert(logger.log.calledWith(...loggerArgs), 'logger.log was called with incorrect args')
        })

        it('should not write to the build dir', function () {
          assert.strict.equal(fsr.writeFileSync.callCount, 1, 'too many files were written')
        })

        it('should resolve the promise', function () {
          assert(resolve.called, 'resolve was not called')
        })
      })
      describe('when expose is true', function () {
        beforeEach(function () {
          fakeGetMap.params.js.bundler.expose = true
          jsBundler.handleBrowserifyResult(bundle, err, jsCode, resolve, reject)
        })

        it('should write to the output dir and log', function () {
          const joinArgs = [
            jsBundler.jsBundledOutput,
            bundle.outputFile
          ]
          const outputArgs = [
            'result 1',
            jsCode,
            'utf8'
          ]
          const loggerArgs = [
            '📝',
            `${jsBundler.appName} writing new JS file result 2`.green
          ]
          assert(path.join.calledWith(...joinArgs), 'path.join was called with incorrect args')
          assert(fsr.writeFileSync.calledWith(...outputArgs), 'writeFileSync was called with incorrect args')
          assert(logger.log.calledWith(...loggerArgs), 'logger.log was called with incorrect args')
        })

        it('should write to the build dir and log', function () {
          const joinArgs = [
            jsBundler.bundleBuildDir,
            bundle.outputFile
          ]
          const outputArgs = [
            'result 3',
            jsCode,
            'utf8'
          ]
          const loggerArgs = [
            '📝',
            `${jsBundler.appName} writing new JS file result 4`.green
          ]
          assert(path.join.calledWith(...joinArgs), 'path.join was called with incorrect args')
          assert(fsr.writeFileSync.calledWith(...outputArgs), 'writeFileSync was called with incorrect args')
          assert(logger.log.calledWith(...loggerArgs), 'logger.log was called with incorrect args')
        })

        it('should resolve the promise', function () {
          assert(resolve.called, 'resolve was not called')
        })
      })
    })
  })

  describe('.conclude', function () {
    let logger
    let proc
    let promises

    beforeEach(function () {
      jsBundler.conclude.restore()
      logger = jsBundler.logger = mocks.logger(fakeGetMap.params.logging)
      proc = { exit: sinon.stub() }
    })

    describe('when promises all resolve', function () {
      beforeEach(function () {
        promises = [
          new Promise((resolve, reject) => { resolve() }),
          new Promise((resolve, reject) => { resolve() })
        ]
      })

      it('should call the callback', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(fakeCallback.called, 'callback was not called after promises resolved')
        })
      })

      it('should not log errors', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(!logger.error.called, 'logger.error was called')
        })
      })

      it('should not exit the process', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(!proc.exit.called, 'process.exit was called')
        })
      })
    })

    describe('when a promise rejects', function () {
      beforeEach(function () {
        promises = [
          new Promise((resolve, reject) => { resolve() }),
          new Promise((resolve, reject) => { reject(new Error('The test said so.')) })
        ]
      })

      it('should not call the callback', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(!fakeCallback.called, 'callback was called')
        })
      })

      it('should log the error', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(logger.error.called, 'logger.error was not called')
        })
      })

      it('should exit the process with code 1', function () {
        return jsBundler.conclude(proc, promises, fakeCallback).then(() => {
          assert(proc.exit.called, 'process.exit was not called')
          assert(proc.exit.calledWith(1), 'process.exit was called with incorrect args')
        })
      })
    })
  })
})
