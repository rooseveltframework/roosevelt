/* eslint-env mocha */

const sinon = require('sinon')
const proxyquire = require('proxyquire')

describe('JS Bundler Tests', function () {
  var fakeGetMap
  var fakeApp
  var fakeCallback
  var jsBundler

  beforeEach(function () {
    fakeGetMap = {
      params: {
        logging: {
          http: true,
          appStatus: true,
          warnings: true,
          verbose: false
        },
        js: {
          bundler: {
            bundles: [
              {
                env: '',
                files: [],
                params: {
                  paths: []
                },
                outputFile: ''
              }
            ],
            expose: {}
          }
        }
      },
      appDir: {},
      appName: {},
      jsPath: {},
      jsBundledOutput: '',
      jsCompiledOutput: {}
    }

    fakeApp = {
      get: sinon.stub().callsFake(function (key) {
        return fakeGetMap[key]
      })
    }
    fakeCallback = function () {}

    jsBundler = proxyquire('../../lib/jsBundler', {
      'browserify': function (files, params) {
        return {
          bundle: sinon.stub()
        }
      },
      'path': {
        join: sinon.stub().returns('path')
      },
      './tools/logger': function (logging) {
        return {
          log: sinon.stub(),
          error: sinon.stub()
        }
      },
      './tools/fsr': function (app) {
        return {
          fileExists: sinon.stub(),
          ensureDirSync: sinon.stub(),
          writeFileSync: sinon.stub()
        }
      }
    })
  })

  it('should run jsBundler in an isolated form', function () {
    jsBundler(fakeApp, fakeCallback)
  })
})
