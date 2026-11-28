const { describe, it, beforeEach, afterEach } = require('node:test')

const assert = require('assert')
const path = require('path')
const fs = require('fs-extra')
const { minify } = require('html-minifier-terser')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('HTML minification', () => {
  const appDir = path.join(__dirname, 'app/htmlMinifier')
  const appConfig = {
    appDir,
    csrfProtection: false,
    expressSession: false,
    http: {
      port: 30110
    },
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
  beforeEach(() => {
    fs.ensureDirSync(path.join(appDir, 'mvc'))
    fs.copySync(path.join(__dirname, './util/mvc/controllers/htmlMinifier.js'), path.join(appDir, 'mvc/controllers/htmlMinifier.js'))
    fs.copySync(path.join(__dirname, './util/mvc/models/teddyModel.js'), path.join(appDir, 'mvc/models/teddyModel.js'))
    fs.copySync(path.join(__dirname, './util/mvc/views/teddyTest.html'), path.join(appDir, 'mvc/views/teddyTest.html'))
  })

  // wipe out test app after each test
  afterEach(async () => {
    if (app) await app.stopServer({ persistProcess: true })
    app = undefined
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // starts the app and hands back the express app supertest requests are made against
  async function start (config = appConfig) {
    app = roosevelt(config)
    await app.startServer()
    return app.expressApp
  }

  async function isMinified (res, options = appConfig.html.minifier.options) {
    return await minify(res.text, options) === res.text
  }

  it('should minify HTML when enabled', async () => {
    const res = await request(await start()).get('/minify').expect(200)
    assert.ok(await isMinified(res))
  })

  it('should minify HTML on routes with callbacks', async () => {
    const res = await request(await start()).get('/callbackRoute').expect(200)
    assert.ok(await isMinified(res))
  })

  it('should hand a failed render to the error page rather than sending the error to the visitor', async () => {
    const res = await request(await start({
      ...appConfig,
      logging: { methods: { ...appConfig.logging.methods, error: false } } // the failed render is logged, and that is expected here
    })).get('/missingView').expect(500)
    assert.ok(res.text.includes('Internal Server Error'), `the visitor was sent something other than the error page: ${res.text.slice(0, 200)}`)
  })

  it('should minify HTML on routes that pass a callback without options', async () => {
    const res = await request(await start()).get('/callbackWithoutOptions').expect(200)
    assert.ok(await isMinified(res))
  })

  it('should not minify HTML when "html.minifier.enable" param is set to false', async () => {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.enable = false
    const res = await request(await start(config)).get('/minify').expect(200)
    assert.ok(!await isMinified(res))
  })

  it('should not minify HTML when "minify" param is set to false', async () => {
    // copy root config and disable HTML minifier
    const config = JSON.parse(JSON.stringify(appConfig))
    config.minify = false
    const res = await request(await start(config)).get('/minify').expect(200)
    assert.ok(!await isMinified(res))
  })

  it('should not minify HTML when requesting exceptionRoutes (string format)', async () => {
    // copy root config and set exceptionRoutes as string
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = '/minify'
    const expressApp = await start(config)
    assert.ok(!await isMinified(await request(expressApp).get('/minify').expect(200)))
    assert.ok(!await isMinified(await request(expressApp).get('/minify?with=query').expect(200)), 'the query string should not stop a route matching')

    // ensure minification is only disabled on the exceptionRoutes by testing another URL
    assert.ok(await isMinified(await request(expressApp).get('/anotherRoute').expect(200)))
  })

  it('should not minify HTML when requesting exceptionRoutes (array format)', async () => {
    // copy root config and set exceptionRoutes as array
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = ['/minify']
    const expressApp = await start(config)
    assert.ok(!await isMinified(await request(expressApp).get('/minify').expect(200)))

    // ensure minification is only disabled on the exceptionRoutes by testing another URL
    assert.ok(await isMinified(await request(expressApp).get('/anotherRoute').expect(200)))
  })

  it('should skip every route in exceptionRoutes rather than only the last one', async () => {
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = ['/minify', '/another*']
    const expressApp = await start(config)
    assert.ok(!await isMinified(await request(expressApp).get('/minify').expect(200)), 'the first entry should be skipped too')
    assert.ok(!await isMinified(await request(expressApp).get('/anotherRoute').expect(200)), 'a wildcard entry should match')
    assert.ok(await isMinified(await request(expressApp).get('/callbackRoute').expect(200)), 'a route in neither entry should be minified')
  })

  it('should match exceptionRoutes against the whole path rather than any part of it', async () => {
    // each entry used to be an unanchored regular expression, so /minify also skipped any url with /minify anywhere in it
    const config = JSON.parse(JSON.stringify(appConfig))
    config.html.minifier.exceptionRoutes = ['/callback']
    const expressApp = await start(config)
    assert.ok(await isMinified(await request(expressApp).get('/callbackRoute').expect(200)))
  })
})
