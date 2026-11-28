const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('routing', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/routing')
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

  async function start (options) {
    const rooseveltApp = roosevelt({
      logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
      appDir,
      expressSession: false,
      onServerStart: app => {
        context.app = app
      },
      ...options
    })
    await rooseveltApp.startServer()
  }

  it('should load controllers from a folder fs.access cannot see, as one inside an Electron app\'s asar archive is', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    // an asar archive's folders answer every check of whether they exist except fs.access, which fs.pathExists asks, and which says they are not there
    const pathExists = fs.pathExists
    fs.pathExists = async () => false
    try {
      await start({ http: { port: 30149 } })
    } finally {
      fs.pathExists = pathExists
    }
    const res = await get('http://localhost:30149/HTMLTest')
    assert.strictEqual(res.status, 200, 'the controllers were not loaded')
    assert.ok(res.data.includes('TitleX'))
  })

  it('should respond to a route handled in a controller file', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    await start({ http: { port: 30130 } })
    const res = await get('http://localhost:30130/HTMLTest')
    assert.strictEqual(res.status, 200)
    assert.ok(res.data.includes('TitleX'))
  })

  it('should resolve a request to a public file', async () => {
    fs.outputFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
    await start({ http: { port: 30131 } })
    const res = await get('http://localhost:30131/text/hello.txt')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.data, 'hello world')
  })

  it('should respond to route hosted in a subdirectory via routePrefix', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    await start({ http: { port: 30132 }, routePrefix: 'foo' })
    const res = await get('http://localhost:30132/foo/HTMLTest')
    assert.strictEqual(res.status, 200)
    assert.ok(res.data.includes('TitleX'))
    assert.strictEqual((await get('http://localhost:30132/HTMLTest')).status, 404, 'the route should not also be served without the prefix')
  })

  it('should resolve a request to a public file hosted in a subdirectory via routePrefix', async () => {
    fs.outputFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
    await start({ http: { port: 30133 }, routePrefix: 'foo' })
    const res = await get('http://localhost:30133/foo/text/hello.txt')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.data, 'hello world')
    assert.strictEqual((await get('http://localhost:30133/text/hello.txt')).status, 404, 'the file should not also be served without the prefix')
  })

  it('should be able to start the app normally without any controller errors, even though there is a non-controller file in the controller folder', async () => {
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    fs.copyFileSync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'mvc/controllers/faviconTest.ico'))
    await start({ http: { port: 30152 } }) // an explicit port rather than the default, which sits inside the range the os hands out for outbound connections and so can be taken by another process on the machine
    const logs = captureLogs.peek()
    assert.ok(logs.includes('Roosevelt Express HTTP server listening on port 30152 (production mode)'))
    assert.ok(!logs.includes('failed to load controller file'), 'the non-controller file should be skipped rather than reported as a broken controller')
  })

  // a controller that throws while loading is a normal thing to hit while developing, and these paths are what turn that into a message worth reading rather than a bare stack trace
  describe('when controllers cannot be loaded', () => {
    it('should name the 404 controller when it fails to load', async () => {
      // a 404.js inside the controllers folder replaces roosevelt's own, so a broken one lands in the 404 loading path rather than the general one
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/404.js'), 'throw new Error("this 404 controller is broken")\n')

      let captured = ''
      captureLogs.start()
      try {
        await roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { enable: false },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } }
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('failed to load 404 controller file'), `expected the 404 loading error, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(captured.includes('this 404 controller is broken'), 'the underlying error should be shown too')
    })

    it('should report a controllers path it cannot read at all', async () => {
      // a file where the folder should be makes reading the folder fail, rather than any single controller failing
      fs.outputFileSync(path.join(appDir, 'mvc/controllers'), 'not a directory\n')

      let captured = ''
      captureLogs.start()
      try {
        await roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { enable: false },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } }
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('could not load controller files from'), `expected the fatal controllers error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should keep serving the other controllers when only one of them is broken', async () => {
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/broken.js'), 'throw new Error("this controller is broken")\n')

      let captured = ''
      let app
      captureLogs.start()
      try {
        const rooseveltApp = roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          frontendReload: { enable: false },
          http: { port: 30273 },
          https: { enable: false },
          logging: { methods: { http: false, info: false, warn: false } },
          onServerStart: started => { app = started }
        })
        await rooseveltApp.startServer()
      } finally {
        captured = captureLogs.stop()
      }
      context.app = app

      assert.ok(captured.includes('failed to load controller file'), 'the broken controller should be named')

      const res = await axios.get('http://localhost:30273/HTMLTest')
      assert.strictEqual(res.status, 200, 'a controller that loaded fine should still be serving')
    })
  })
})
