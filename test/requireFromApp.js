const { describe, it, afterEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const requireFromApp = require('../lib/tools/requireFromApp')

describe('loading the packages an app supplies', () => {
  const appDir = path.join(__dirname, 'app/requireFromApp')

  // writes a package into the test app's own node_modules
  function appPackage (name, source) {
    fs.outputJsonSync(path.join(appDir, 'node_modules', name, 'package.json'), { name, main: 'index.js' })
    fs.outputFileSync(path.join(appDir, 'node_modules', name, 'index.js'), source)
  }

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    // node keeps what it has required by path, and every test here writes its packages to the same paths, so what one test loaded is forgotten before the next writes its own
    for (const file of Object.keys(require.cache)) if (file.startsWith(appDir)) delete require.cache[file]
  })

  it('should load a package from the app rather than from roosevelt when both have it', () => {
    // roosevelt has fs-extra of its own, so a plain require from roosevelt would find that one
    appPackage('fs-extra', 'module.exports = { appCopy: true }')
    fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test-app' })
    assert.strictEqual(requireFromApp(appDir, 'fs-extra', require).appCopy, true)
  })

  it('should fall back to roosevelt\'s own copy of a package the app does not have', () => {
    fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test-app' })
    assert.strictEqual(requireFromApp(appDir, 'supertest', require), request)
  })

  it('should report a package the app has that fails to load rather than falling back', () => {
    appPackage('a-broken-package', 'require(\'a-dependency-that-is-not-installed\')')
    fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test-app' })
    assert.throws(() => requireFromApp(appDir, 'a-broken-package', require), /a-dependency-that-is-not-installed/)
  })

  it('should render with the view engine the app installed rather than roosevelt\'s copy of it', async () => {
    // roosevelt has teddy as a development dependency, so without loading from the app this would render with that one
    appPackage('teddy', 'module.exports = { __express: (file, model, callback) => callback(null, \'rendered by the app\\\'s teddy\') }')
    fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test-app', version: '0.0.1', dependencies: { express: '5.0.0' } })
    fs.outputFileSync(path.join(appDir, 'mvc/views/page.html'), '<p>rendered by roosevelt\'s teddy</p>')
    fs.outputFileSync(path.join(appDir, 'mvc/controllers/page.js'), 'module.exports = router => router.get(\'/page\', (req, res) => res.render(\'page\'))')

    const app = roosevelt({
      appDir,
      makeBuildArtifacts: false,
      preprocessedViewsPath: false, // nothing is built here, so views are read from where they were written
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      http: { enable: false },
      https: { enable: false },
      viewEngine: ['html:teddy'],
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } }
    })
    await app.initServer()

    const res = await request(app.expressApp).get('/page')
    assert.strictEqual(res.text, 'rendered by the app\'s teddy')
  })
})
