const { describe, it, after, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('controllers bundler', () => {
  const appDir = path.join(__dirname, 'app/controllersBundler')
  const controllersDir = path.join(appDir, 'mvc/controllers')

  const appConfig = {
    appDir,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        error: false,
        verbose: false
      }
    },
    makeBuildArtifacts: true,
    csrfProtection: false,
    expressSession: false,
    htmlValidator: { enable: false }
  }

  // a controller with no decorator comment on its first line
  const plainController = `module.exports = (router, app) => {
  router.get('/plain', (req, res) => res.send('plain'))
}
`

  // writes a controller file, optionally prefixed with a decorator comment
  function writeController (name, decorator) {
    const file = path.join(controllersDir, name)
    fs.ensureDirSync(path.dirname(file))
    fs.writeFileSync(file, decorator ? `${decorator}\n${plainController}` : plainController)
  }

  // reads a generated bundle, or returns null when it was not generated
  // clientControllers.output is resolved relative to the build folder, so bundles land in .build/js by default
  function readBundle (bundleName) {
    const file = path.join(appDir, '.build/js', bundleName)
    return fs.pathExistsSync(file) ? fs.readFileSync(file, 'utf8') : null
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(controllersDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should not generate a bundle when the feature is disabled', async () => {
    writeController('a.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: false, exposeAll: true } }).initServer()

    assert.strictEqual(readBundle('controllers.js'), null)
  })

  it('should name the bundle after controllers rather than views when nothing says otherwise', () => {
    // every other test in this file passes defaultBundle explicitly, so nothing was reading the default itself
    // it shares an output folder with the views bundler, whose default is views.js, so the two would land on the same file
    const params = roosevelt({ ...appConfig, makeBuildArtifacts: false }).expressApp.get('params')

    assert.strictEqual(params.clientControllers.defaultBundle, 'controllers.js')
    assert.notStrictEqual(params.clientControllers.defaultBundle, params.clientViews.defaultBundle, 'the two bundlers should not default to the same filename')
  })

  it('should not generate a bundle when makeBuildArtifacts is false', async () => {
    writeController('a.js')

    await roosevelt({ ...appConfig, makeBuildArtifacts: false, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' } }).initServer()

    assert.strictEqual(readBundle('controllers.js'), null)
  })

  it('should bundle every controller when exposeAll is enabled', async () => {
    writeController('a.js')
    writeController('b.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' } }).initServer()

    const bundle = readBundle('controllers.js')
    assert.ok(bundle.includes('a.js'), 'a.js should be in the bundle')
    assert.ok(bundle.includes('b.js'), 'b.js should be in the bundle')
  })

  it('should bundle controllers in subdirectories', async () => {
    writeController(path.join('nested', 'deep.js'))

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' } }).initServer()

    assert.ok(readBundle('controllers.js').includes('deep.js'))
  })

  it('should omit controllers named in the blocklist param', async () => {
    writeController('a.js')
    writeController('secret.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js', blocklist: ['secret.js'] } }).initServer()

    const bundle = readBundle('controllers.js')
    assert.ok(bundle.includes('a.js'))
    assert.strictEqual(bundle.includes('secret.js'), false, 'a blocklisted controller should not be bundled')
  })

  it('should omit controllers carrying a roosevelt-blocklist comment', async () => {
    writeController('a.js')
    writeController('secret.js', '// roosevelt-blocklist')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' } }).initServer()

    const bundle = readBundle('controllers.js')
    assert.ok(bundle.includes('a.js'))
    assert.strictEqual(bundle.includes('secret.js'), false, 'a controller decorated as blocklisted should not be bundled')
  })

  it('should bundle controllers into the bundle named by their roosevelt-allowlist comment', async () => {
    writeController('a.js', '// roosevelt-allowlist mine.js')
    writeController('b.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, defaultBundle: 'controllers.js' } }).initServer()

    const bundle = readBundle('mine.js')
    assert.ok(bundle, 'the bundle named in the decorator should have been written')
    assert.ok(bundle.includes('a.js'), 'the decorated controller should be in its named bundle')
    assert.strictEqual(bundle.includes('b.js'), false, 'an undecorated controller should not be in it')
  })

  it('should add several decorated controllers to the same named bundle', async () => {
    writeController('a.js', '// roosevelt-allowlist shared.js')
    writeController('b.js', '// roosevelt-allowlist shared.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, defaultBundle: 'controllers.js' } }).initServer()

    const bundle = readBundle('shared.js')
    assert.ok(bundle.includes('a.js'))
    assert.ok(bundle.includes('b.js'))
  })

  it('should bundle the files named in the allowlist param', async () => {
    writeController('a.js')
    writeController('b.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, allowlist: { 'listed.js': ['a.js'] } } }).initServer()

    const bundle = readBundle('listed.js')
    assert.ok(bundle.includes('a.js'))
    assert.strictEqual(bundle.includes('b.js'), false, 'only the allowlisted controller should be bundled')
  })

  it('should not use exposeAll when an allowlist is supplied', async () => {
    writeController('a.js')
    writeController('b.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js', allowlist: { 'listed.js': ['a.js'] } } }).initServer()

    assert.ok(readBundle('listed.js'), 'the allowlisted bundle should exist')
    assert.strictEqual(readBundle('controllers.js'), null, 'the exposeAll bundle should not have been generated')
  })

  it('should write a bundle that requires each controller and exports a function', async () => {
    writeController('a.js')

    await roosevelt({ ...appConfig, clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' } }).initServer()

    const bundle = readBundle('controllers.js')
    assert.ok(bundle.startsWith('/* Do not edit; generated automatically by Roosevelt */'), 'the bundle should be marked as generated')
    assert.ok(bundle.includes('module.exports = (router, app) => {'), 'the bundle should export a function')
    assert.ok(bundle.includes("require('a.js')(router, app)"), 'the bundle should require each controller')
  })

  it('should log an error when a bundle cannot be built', async () => {
    writeController('a.js')

    // make the bundle impossible to write by occupying its destination with a directory
    fs.ensureDirSync(path.join(appDir, '.build/js', 'controllers.js'))

    // the logger is not attached to the app until initServer runs, so the error is captured off the console instead
    let captured = ''
    captureLogs.start()

    try {
      await roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        clientControllers: { enable: true, exposeAll: true, defaultBundle: 'controllers.js' }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }

    assert.ok(captured.includes('Failed to create controller bundle'), `expected a failure to be logged, got: ${JSON.stringify(captured.slice(0, 400))}`)
  })
})
