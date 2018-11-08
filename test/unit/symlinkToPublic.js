/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const path = require('path')
const roosevelt = require('../../roosevelt')

describe('symlinkToPublic Parameter Tests', function () {
  const appDir = path.join(__dirname, '../app/symlinkToPublic')
  const appConfig = {
    appDir: appDir,
    logging: {
      http: false,
      appStatus: false,
      warnings: false,
      verbose: false
    }
  }
  let app

  // wipe out test app after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should populate staticsSymlinksToPublic with js sourcePath when compiler is disabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure js sourcePath is included
    assert(params.staticsSymlinksToPublic.includes(params.js.sourcePath))

    // ensure js output is not included
    assert(!params.staticsSymlinksToPublic.includes(`js: ${params.js.output}`))
  })

  it('should populate staticsSymlinksToPublic with js output dir when compiler is enabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        compiler: {
          nodeModule: 'roosevelt-uglify'
        },
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure js output is included
    assert(params.staticsSymlinksToPublic.includes(`js: ${params.js.output}`))

    // ensure js sourcePath is not included
    assert(!params.staticsSymlinksToPublic.includes(params.js.sourcePath))
  })

  it('should populate staticsSymlinksToPublic with css sourcePath when compiler is disabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      css: {
        sourcePath: 'css',
        output: '.build/css',
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure css sourcePath is included
    assert(params.staticsSymlinksToPublic.includes(params.css.sourcePath))

    // ensure css output is not included
    assert(!params.staticsSymlinksToPublic.includes(`css: ${params.css.output}`))
  })

  it('should populate staticsSymlinksToPublic with css output dir when compiler is enabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      css: {
        sourcePath: 'css',
        output: '.build/css',
        compiler: {
          nodeModule: 'roosevelt-less'
        },
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure css output is included
    assert(params.staticsSymlinksToPublic.includes(`css: ${params.css.output}`))

    // ensure css sourcePath is not included
    assert(!params.staticsSymlinksToPublic.includes(params.css.sourcePath))
  })

  it('should not populate staticsSymlinksToPublic with js/css sourcePath when symlinkToPublic is disabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        symlinkToPublic: false
      },
      css: {
        sourcePath: 'css',
        output: '.build/css',
        symlinkToPublic: false
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure staticsSymlinksToPublic has not changed
    assert.deepStrictEqual(params.staticsSymlinksToPublic, [])
  })

  it('should not populate staticsSymlinksToPublic with js/css output dir when symlinkToPublic is disabled', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        compiler: {
          nodeModule: 'roosevelt-uglify'
        },
        symlinkToPublic: false
      },
      css: {
        sourcePath: 'css',
        output: '.build/css',
        compiler: {
          nodeModule: 'roosevelt-less'
        },
        symlinkToPublic: false
      },
      staticsSymlinksToPublic: []
    })

    let params = app.expressApp.get('params')

    // ensure staticsSymlinksToPublic has not changed
    assert.deepStrictEqual(params.staticsSymlinksToPublic, [])
  })

  it('should not populate staticsSymlinksToPublic with js/css sourcePath when it already contains a js/css directory ', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        symlinkToPublic: true
      },
      css: {
        sourcePath: 'csss',
        output: '.build/css',
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: ['js: .build/js', 'css: .build/css']
    })

    let params = app.expressApp.get('params')

    // ensure staticsSymlinksToPublic has not changed
    assert.deepStrictEqual(params.staticsSymlinksToPublic, ['js: .build/js', 'css: .build/css'])
  })

  it('should not populate staticsSymlinksToPublic with js/css output dir when it already contains a js/css directory', function () {
    // init roosevelt constructor
    app = roosevelt({
      ...appConfig,
      js: {
        sourcePath: 'js',
        output: '.build/js',
        compiler: {
          nodeModule: 'roosevelt-uglify'
        },
        symlinkToPublic: true
      },
      css: {
        sourcePath: 'css',
        output: '.build/css',
        compiler: {
          nodeModule: 'roosevelt-less'
        },
        symlinkToPublic: true
      },
      staticsSymlinksToPublic: ['js', 'css']
    })

    let params = app.expressApp.get('params')

    // ensure staticsSymlinksToPublic has not changed
    assert.deepStrictEqual(params.staticsSymlinksToPublic, ['js', 'css'])
  })
})
