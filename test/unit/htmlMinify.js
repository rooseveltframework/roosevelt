/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const fs = require('fs-extra')
const minify = require('html-minifier').minify
const request = require('supertest')
const roosevelt = require('../../roosevelt')

describe('htmlMinify', function () {
  const appDir = path.join(__dirname, '../app/htmlMinify')
  const appConfig = {
    appDir: appDir,
    suppressLogs: {
      httpLogs: true,
      rooseveltLogs: true,
      rooseveltWarnings: true,
      verboseLogs: true
    },
    generateFolderStructure: true,
    viewEngine: 'html:teddy',
    htmlMinify: {
      enable: true,
      exceptionURL: false,
      options: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true
      }
    }
  }
  let app

  // generate test app directory structure
  beforeEach(function () {
    fs.ensureDirSync(path.join(appDir, 'mvc'))
    fs.copySync(path.join(__dirname, '../util/mvc/controllers/htmlMinifier.js'), path.join(appDir, 'mvc/controllers/htmlMinifier.js'))
    fs.copySync(path.join(__dirname, '../util/mvc/models/teddyModel.js'), path.join(appDir, 'mvc/models/teddyModel.js'))
    fs.copySync(path.join(__dirname, '../util/mvc/views/teddyTest.html'), path.join(appDir, 'mvc/views/teddyTest.html'))
  })

  // wipe out test app after each test
  afterEach(function (done) {
    app.httpServer.close()

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
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, appConfig.htmlMinify.options)
            assert.equal(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should minify HTML on routes with callbacks', function (done) {
    // initialize test app
    app = roosevelt({
      ...appConfig,
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, appConfig.htmlMinify.options)
            assert.equal(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when "htmlMinify.enable" param is set to false', function (done) {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.htmlMinify.enable = false

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.notEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when "noMinify" param is set to true', function (done) {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.noMinify = true

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.notEqual(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when requesting exceptionURL (string format)', function (done) {
    // copy root config and set exceptionURL as string
    const config = JSON.parse(JSON.stringify(appConfig))
    config.htmlMinify.exceptionURL = '/minify'

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.notEqual(testMinify, res.text)

            // ensure minification is only disabled on the exceptionURL by testing another URL
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.equal(testMinify, res.text)
          }
          done()
        })
    }
  })

  it('should not minify HTML when requesting exceptionURL (array format)', function (done) {
    // copy root config and set exceptionURL as array
    const config = JSON.parse(JSON.stringify(appConfig))
    config.htmlMinify.exceptionURL = ['/minify']

    // initialize test app
    app = roosevelt({
      ...config,
      onServerStart: onServerStart
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.notEqual(testMinify, res.text)

            // ensure minification is only disabled on the exceptionURL by testing another URL
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
            const testMinify = minify(res.text, config.htmlMinify.options)
            assert.equal(testMinify, res.text)
          }
          done()
        })
    }
  })
})
