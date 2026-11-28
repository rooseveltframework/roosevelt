const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('method params', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/paramFunctions')
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

  it('should execute what is in onServerInit', async () => {
    let pass = false
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      appDir,
      expressSession: false,
      onServerInit: app => {
        context.app = app
        pass = true
      }
    })
    await rooseveltApp.initServer()
    assert.ok(pass, 'onServerInit did not fire')
  })

  it('should execute what is in onAppExit', async () => {
    let pass = false
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30113 },
      appDir,
      expressSession: false,
      onServerInit: app => {
        context.app = app
      },
      onAppExit: () => {
        pass = true
      }
    })
    await rooseveltApp.startServer()

    // stopping without persistProcess exits the process, which would end the test run
    const originalProcessExit = process.exit
    process.exit = () => {}
    try {
      await rooseveltApp.stopServer()
    } finally {
      process.exit = originalProcessExit
    }
    assert.ok(pass, 'onAppExit did not fire')
  })

  it('should log an error if there is a controller that is not coded properly', async () => {
    fs.copySync(path.join(__dirname, './util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30114 },
      appDir,
      expressSession: false,
      makeBuildArtifacts: true,
      onServerInit: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    assert.ok(captureLogs.peek().includes('Roosevelt Express failed to load controller file'), 'No error logged')
  })

  // routing.js covers a broken 404.js, which replaces roosevelt's own by its name; this covers one the errorPages.notFound param points at instead
  it('should log an error naming the custom 404 page passed in when it has a syntax error', async () => {
    const notFound = path.join(appDir, 'mvc/controllers/broken404.js')
    fs.outputFileSync(notFound, 'module.exports = (router) => {\n  router.route(\n')
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      http: { port: 30115 },
      appDir,
      expressSession: false,
      makeBuildArtifacts: true,
      errorPages: {
        notFound: 'broken404.js'
      },
      onServerInit: app => {
        context.app = app
      }
    })
    await rooseveltApp.startServer()
    const logs = captureLogs.peek()
    assert.ok(logs.includes(`Roosevelt Express failed to load 404 controller file: ${notFound}`), `expected the 404 loading error naming the file, got: ${logs.slice(0, 500)}`)
    assert.ok(logs.includes('SyntaxError'), 'the underlying error should be shown too')
    assert.ok(!logs.includes('Roosevelt Express failed to load controller file'), 'the custom 404 page should not also be loaded as an ordinary controller')
  })
})
