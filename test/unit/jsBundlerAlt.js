/* eslint-env mocha */

const squire = require('squirejs')

describe.only('JS Bundler Tests', function () {
  var injector
  var mockBrowserify
  var mockPath
  var mockLogger
  var mockFsr

  var fakeApp
  var fakeCallback

  var jsBundler
  beforeEach(function () {
    mockBrowserify = {}
    mockPath = {}
    mockLogger = {}
    mockFsr = {}

    fakeApp = {}
    fakeCallback = function () {}

    injector = new squire.Squire()
    injector.mock('browserify', mockBrowserify)
    injector.mock('path', mockPath)
    injector.mock('./tools/logger', mockLogger)
    injector.mock('./tools/fsr', mockFsr)

    jsBundler = require('../../lib/jsBundler')
  })

  it('should explode because the injector mocks are not complete yet', function () {
    jsBundler(fakeApp, fakeCallback)
  })
})
