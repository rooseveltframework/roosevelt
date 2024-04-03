/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const cleanupTestApp = require('./util/cleanupTestApp')
const fs = require('fs-extra')
const { minify } = require('html-minifier')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('HTML Minification Tests', function () {
  const appDir = path.join(__dirname, 'app/htmlMinifier')
  const appConfig = {
    appDir,
    csrfProtection: false,
    port: 41002,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        verbose: false
      }
    },
    makeBuildArtifacts: true,
    viewEngine: 'html:teddy',
    hostPublic: false, // this line gives us free coverage of an unrelated warning
    html: {
      minifier: {
        enable: true,
        exceptionRoutes: false,
        options: {
          removeComments: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true
        }
      }
    }
  }
  let app

  // generate test app directory structure
  beforeEach(function () {
    fs.ensureDirSync(path.join(appDir, 'mvc'))
    fs.copySync(path.join(__dirname, './util/mvc/controllers/htmlMinifier.js'), path.join(appDir, 'mvc/controllers/htmlMinifier.js'))
    fs.copySync(path.join(__dirname, './util/mvc/models/teddyModel.js'), path.join(appDir, 'mvc/models/teddyModel.js'))
    fs.copySync(path.join(__dirname, './util/mvc/views/teddyTest.html'), path.join(appDir, 'mvc/views/teddyTest.html'))
  })

  // wipe out test app after each test
  afterEach(function (done) {
    app.stopServer('close')

    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should minify HTML when enabled', function (done) {
    // initialize test app
    app = roosevelt({
      ...appConfig,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/minify')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, appConfig.html.minifier.options)
            assert.strictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should minify HTML on routes with callbacks', function (done) {
    // initialize test app
    app = roosevelt({
      ...appConfig,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/callbackRoute')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, appConfig.html.minifier.options)
            assert.strictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when "html.minifier.enable" param is set to false', function (done) {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.enable = false

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/minify')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.notStrictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when "minify" param is set to false', function (done) {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.minify = false

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/minify')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.notStrictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when requesting exceptionRoutes (string format)', function (done) {
    // copy root config and set exceptionRoutes as string
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = '/minify'

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/minify')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.notStrictEqual(testMinify, res.text)

            // ensure minification is only disabled on the exceptionRoutes by testing another URL
            checkSecondURL(app)
          }
        })
    }

    function checkSecondURL (app) {
      request(app)
        .get('/anotherRoute')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.strictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when requesting exceptionRoutes (array format)', function (done) {
    // copy root config and set exceptionRoutes as array
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = ['/minify']

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart
    })

    app.startServer()

    // run the test once the server is started
    function onServerStart (app) {
      request(app)
        .get('/minify')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.notStrictEqual(testMinify, res.text)

            // ensure minification is only disabled on the exceptionRoutes by testing another URL
            checkSecondURL(app)
          }
        })
    }

    function checkSecondURL (app) {
      request(app)
        .get('/anotherRoute')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
          } else {
            const testMinify = minify(res.text, config.html.minifier.options)
            assert.strictEqual(testMinify, res.text)
          }
          done()
        })
    }
  })
})
