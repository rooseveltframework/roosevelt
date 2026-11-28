const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('public folder', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/publicFolder')
  beforeEach(() => {
    captureLogs.start()
  })

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach(async () => {
    const server = context.app?.get('httpServer')
    if (server?.listening) {
      await new Promise(resolve => {
        server.close(resolve)
        server.closeAllConnections?.()
      })
    }
    context.app = undefined
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // an error status is something these tests assert on, so it is handed back rather than thrown
  function get (url) {
    return axios.get(url, { validateStatus: () => true })
  }

  it('should serve a static site, which has no controllers to serve instead', async () => {
    fs.outputFileSync(path.join(appDir, 'statics/pages/index.html'), '<p>a static site</p>')
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      appDir,
      makeBuildArtifacts: 'staticsOnly',
      viewEngine: 'html: teddy',
      htmlValidator: { enable: false },
      csrfProtection: false,
      expressSession: false,
      http: { port: 30140 },
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const res = await get('http://localhost:30140/')
    assert.strictEqual(res.status, 200)
    assert.ok(res.data.includes('a static site'), `expected the built page to be served, got: ${res.data.slice(0, 120)}`)
  })

  it('should allow for a custom favicon and GET that favicon on request', async () => {
    fs.copySync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'statics/images/faviconTest.ico'))
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30116 },
      appDir,
      expressSession: false,
      favicon: 'images/faviconTest.ico',
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const res = await get('http://localhost:30116/favicon.ico')
    assert.strictEqual(res.status, 200)
    assert.ok(!res.data.includes('404 Not Found'))
  })

  it('should allow for no favicon with a null paramter', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30117 },
      appDir,
      expressSession: false,
      favicon: null,
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const res = await get('http://localhost:30117/favicon.ico')
    assert.strictEqual(res.status, 404)
    assert.ok(res.data.includes('404 Not Found'))
  })

  it('should allow the user to set favicon to a wrong or non-existent path and have no favicon show up', async () => {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30118 },
      appDir,
      expressSession: false,
      favicon: 'images/nothingHere.ico',
      onServerStart: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const res = await get('http://localhost:30118/favicon.ico')
    assert.strictEqual(res.status, 404)
    assert.ok(res.data.includes('404 Not Found'))
  })

  it('should set the name of folder inside of public to the version inside of package.json', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    fs.writeFileSync(path.join(appDir, 'package.json'), '{ "version": "0.5.1", "rooseveltConfig": {} }')
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30119 },
      appDir,
      expressSession: false,
      makeBuildArtifacts: true,
      versionedPublic: true,
      onServerInit: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()

    // the folder itself is the thing being tested, and looking at it avoids depending on how a path is spelled in a log message, which differs between windows and everywhere else
    assert.ok(fs.existsSync(path.join(appDir, 'public', '0.5.1')), 'Versioned public folder not created')
  })

  it('should tell browsers to keep the files in the versioned public folder, which change address with each version, but not in development mode', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    fs.writeFileSync(path.join(appDir, 'package.json'), '{ "version": "0.5.2", "rooseveltConfig": {} }')
    const settings = (mode, port) => ({
      logging: { methods: { http: false } },
      http: { port },
      appDir,
      mode,
      expressSession: false,
      csrfProtection: false,
      makeBuildArtifacts: true,
      versionedPublic: true,
      hostPublic: true,
      onServerInit: app => {
        context.app = app
        // a file in the versioned public folder, once the app has made it. its version is the app's, which may be another test's in this file, since node caches the package.json it is read from
        fs.outputFileSync(path.join(app.get('params').publicFolder, 'images/example.txt'), 'a file')
        context.versionedPath = '/' + path.basename(app.get('params').publicFolder) + '/images/example.txt'
      }
    })

    // each app is stopped however its request went, so a failed one does not leave its server running into the next test
    const production = roosevelt(settings('production', 30126))
    let kept
    try {
      await production.startServer()
      kept = await get('http://localhost:30126' + context.versionedPath)
    } finally {
      await production.stopServer({ persistProcess: true })
    }

    const development = roosevelt(settings('development', 30145)) // a port of its own, since the request above may have left a connection open to the app before. its mode is its own, even though the app before set NODE_ENV to production
    let checked
    try {
      await development.startServer()
      checked = await get('http://localhost:30145' + context.versionedPath)
    } finally {
      await development.stopServer({ persistProcess: true })
    }

    assert.strictEqual(kept.status, 200)
    assert.strictEqual(checked.status, 200)
    assert.strictEqual(kept.headers['cache-control'], 'public, max-age=31536000, immutable')
    assert.notStrictEqual(checked.headers['cache-control'], 'public, max-age=31536000, immutable') // rebuilt in place as it is edited, so the browser has to check
  })
})
