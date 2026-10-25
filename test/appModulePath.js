const { describe, it, after, before } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const appModulePath = require('../lib/tools/appModulePath')

// makes the app's own folders requirable by name, which is what lets a controller say require('models/dataModel')
//
// this was the app-module-path package until it went eight years without a commit; these pin the behavior roosevelt actually relies on so that owning it does not mean guessing at it
describe('app module path', () => {
  const appDir = path.join(__dirname, 'app/appModulePath')

  before(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.outputFileSync(path.join(appDir, 'mvc/models/probeModel.js'), "module.exports = 'the app model'\n")
    fs.outputFileSync(path.join(appDir, 'consumer.js'), "module.exports = require('models/probeModel')\n")

    // a dependency that happens to require something by the same name means its own, not the app's
    fs.outputFileSync(path.join(appDir, 'node_modules/somedep/index.js'), "try { module.exports = require('models/probeModel') } catch { module.exports = 'could not reach the app' }\n")

    appModulePath.addPath(path.join(appDir, 'mvc'))
  })

  after(() => fs.rmSync(appDir, { recursive: true, force: true }))

  it('should make a folder requirable by name', () => {
    assert.strictEqual(require(path.join(appDir, 'consumer.js')), 'the app model')
  })

  it('should not let code inside node_modules reach the app by name', () => {
    assert.strictEqual(require(path.join(appDir, 'node_modules/somedep/index.js')), 'could not reach the app', 'a dependency resolving the app\'s own model names would be able to shadow or steal them')
  })

  it('should add a path when the entry point has no search list of its own, as in Electron\'s main process', () => {
    const main = require.main
    const paths = main?.paths
    if (main) delete main.paths
    try {
      const otherDir = path.join(appDir, 'other')
      fs.outputFileSync(path.join(otherDir, 'helpers/probeHelper.js'), "module.exports = 'the app helper'\n")
      fs.outputFileSync(path.join(appDir, 'otherConsumer.js'), "module.exports = require('helpers/probeHelper')\n")
      assert.doesNotThrow(() => appModulePath.addPath(otherDir))
      assert.strictEqual(require(path.join(appDir, 'otherConsumer.js')), 'the app helper', 'modules loaded afterwards should still find the path')
    } finally {
      if (main) main.paths = paths
    }
  })

  it('should ignore a path it already has', () => {
    const before = require.main?.paths.length
    appModulePath.addPath(path.join(appDir, 'mvc'))
    assert.strictEqual(require.main?.paths.length, before, 'adding the same path twice should not grow the search list')
  })
})
