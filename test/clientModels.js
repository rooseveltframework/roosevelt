const { describe, it, after, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const captureLogsUtil = require('./util/captureLogs')

// runs a build with roosevelt's console output collected, so a warning can be asserted on
async function captureLogs (run) {
  captureLogsUtil.start()
  let captured = ''
  try {
    await run()
  } finally {
    captured = captureLogsUtil.stop()
  }
  return captured
}

// the front end counterparts roosevelt writes for the models the server has, so an isomorphic controller can require the same model name on both sides without the app writing a fetch by hand for every one of them
describe('client models', () => {
  const appDir = path.join(__dirname, 'app/clientModels')
  const generated = path.join(appDir, '.build/js/models')

  const appConfig = {
    appDir,
    logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
    makeBuildArtifacts: true,
    csrfProtection: false,
    expressSession: false,
    htmlValidator: { enable: false },
    http: { enable: false },
    https: { enable: false }
  }

  function writeModel (name, contents = 'module.exports = () => ({})\n') {
    fs.outputFileSync(path.join(appDir, 'mvc/models', name), contents)
  }

  async function build (clientModels) {
    await roosevelt({ ...appConfig, clientModels }).initServer()
  }

  const wrote = name => fs.pathExistsSync(path.join(generated, name))
  const read = name => fs.readFileSync(path.join(generated, name), 'utf8')

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should write nothing unless the feature is enabled', async () => {
    writeModel('homepage.js')

    await build(undefined)

    assert.strictEqual(fs.pathExistsSync(generated), false, 'the feature is off by default')
  })

  it('should write a front end model for each model the server has', async () => {
    writeModel('homepage.js')
    writeModel('global.js')

    await build({ enable: true, exposeAll: true })

    assert.ok(wrote('homepage.js'))
    assert.ok(wrote('global.js'))
  })

  it('should write one that posts to the api route for that model', async () => {
    writeModel('homepage.js')

    await build({ enable: true, exposeAll: true })

    const contents = read('homepage.js')
    assert.ok(contents.includes("route: '/api/homepage'"), `expected the model's api route, got: ${contents}`)
    assert.ok(contents.includes('generated automatically by Roosevelt'), 'it should say it is generated, since editing it would be lost')
  })

  it('should keep the folders a model sits in, so a nested model keeps its name', async () => {
    writeModel('admin/reports.js')

    await build({ enable: true, exposeAll: true })

    assert.ok(wrote(path.join('admin', 'reports.js')))
    assert.ok(read(path.join('admin', 'reports.js')).includes("route: '/api/admin/reports'"))
  })

  it('should skip a model the blocklist names', async () => {
    writeModel('homepage.js')
    writeModel('server/secrets.js')

    await build({ enable: true, exposeAll: true, blocklist: ['server/*'] })

    assert.ok(wrote('homepage.js'))
    assert.strictEqual(wrote(path.join('server', 'secrets.js')), false, 'a blocklisted model should not be exposed')
  })

  it('should skip a model that blocklists itself with a comment on its first line', async () => {
    writeModel('homepage.js')
    writeModel('serverOnly.js', '// roosevelt-blocklist\nmodule.exports = () => ({})\n')

    await build({ enable: true, exposeAll: true })

    assert.ok(wrote('homepage.js'))
    assert.strictEqual(wrote('serverOnly.js'), false, 'a model that marks itself should not be exposed')
  })

  it('should expose only what an allowlist names', async () => {
    writeModel('homepage.js')
    writeModel('global.js')

    await build({ enable: true, exposeAll: true, allowlist: ['homepage.js'] })

    assert.ok(wrote('homepage.js'))
    assert.strictEqual(wrote('global.js'), false, 'an allowlist should be the whole list')
  })

  it('should use the api route the app configured', async () => {
    writeModel('homepage.js')

    await build({ enable: true, exposeAll: true, apiRoute: '/data' })

    assert.ok(read('homepage.js').includes("route: '/data/homepage'"))
  })

  it('should write into the build folder rather than over an app\'s own front end model', async () => {
    // every bundler searches the js source path before the build folder, so an app that writes its own is the one that gets bundled; roosevelt never touches it
    writeModel('homepage.js')
    const ownModel = path.join(appDir, 'statics/js/models/homepage.js')
    fs.outputFileSync(ownModel, 'module.exports = async () => ({ mine: true })\n')

    await build({ enable: true, exposeAll: true })

    assert.strictEqual(fs.readFileSync(ownModel, 'utf8'), 'module.exports = async () => ({ mine: true })\n', 'the app\'s own model should be left alone')
    assert.ok(wrote('homepage.js'), 'the generated one still gets written, it is just never reached')
  })

  describe('the app\'s own _defaultModel', () => {
    // roosevelt writes the rote per model files and nothing else; the one file worth reading belongs to the app
    function writeOwnDefaultModel () {
      fs.outputFileSync(path.join(appDir, 'statics/js/models/_defaultModel.js'), 'module.exports = async () => ({})\n')
    }

    it('should not write a _defaultModel of its own', async () => {
      writeModel('homepage.js')
      writeOwnDefaultModel()

      await build({ enable: true, exposeAll: true })

      assert.strictEqual(wrote('_defaultModel.js'), false, 'that file is the app\'s to write, not roosevelt\'s')
      assert.deepStrictEqual(fs.readdirSync(generated), ['homepage.js'], 'only the rote per model files should be generated')
    })

    it('should have every generated model call it rather than doing the work itself', async () => {
      writeModel('homepage.js')
      writeModel('global.js')
      writeOwnDefaultModel()

      await build({ enable: true, exposeAll: true })

      for (const model of ['homepage.js', 'global.js']) {
        const contents = read(model)
        assert.ok(contents.includes("require('models/_defaultModel')"), `${model} should hand off to it, got: ${contents}`)
        assert.strictEqual(contents.includes('fetch('), false, `${model} should not fetch for itself, got: ${contents}`)
      }
    })

    it('should tell the model which one it is standing in for, not just where to post', async () => {
      // an implementation that is not http at all works from the name, so the name has to be part of what it is handed
      writeModel('admin/reports.js')
      writeOwnDefaultModel()

      await build({ enable: true, exposeAll: true })

      const contents = read(path.join('admin', 'reports.js'))
      assert.ok(contents.includes("model: 'admin/reports'"), `expected the model name, got: ${contents}`)
      assert.ok(contents.includes("route: '/api/admin/reports'"), `expected the route too, got: ${contents}`)
      assert.ok(contents.includes('...args)'), 'and whatever the caller passed')
    })

    it('should say so when the app has not written one yet, rather than leaving the bundler to fail', async () => {
      writeModel('homepage.js')

      const captured = await captureLogs(() => roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: true, error: false, verbose: false } },
        clientModels: { enable: true, exposeAll: true }
      }).initServer())

      assert.match(captured, /_defaultModel\.js/, `expected the missing file to be named, got: ${captured}`)
      assert.ok(wrote('homepage.js'), 'and the models are still generated, since the app may be about to write it')
    })

    it('should not generate a model over that name when an app has a model called it', async () => {
      writeModel('_defaultModel.js', 'module.exports = () => ({ iAmAModel: true })\n')
      writeModel('homepage.js')
      writeOwnDefaultModel()

      await build({ enable: true, exposeAll: true })

      assert.strictEqual(wrote('_defaultModel.js'), false, 'generating one there would shadow nothing and confuse everything')
    })
  })
})
