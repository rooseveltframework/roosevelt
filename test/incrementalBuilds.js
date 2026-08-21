const { describe, it, after, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const less = require('less')
const roosevelt = require('../roosevelt')

// build artifacts are written here rather than to the test directory itself, since roosevelt otherwise defaults appDir to the directory of the requiring module
const appDir = path.join(__dirname, 'app/incrementalBuilds')

// counts how many times the css preprocessor actually ran, which is how these tests tell a skipped build from a rebuild that happened to produce identical output
let compiles = 0
const realRender = less.render.bind(less)
less.render = (...args) => {
  compiles++
  return realRender(...args)
}

const mainLess = '@import "_partial";\nbody { height: 100%; }\n'
const partialLess = '.partial { color: red; }\n'

function baseConfig (overrides = {}) {
  return {
    mode: 'production',
    appDir,
    makeBuildArtifacts: true,
    csrfProtection: false,
    expressSession: false,
    htmlValidator: { enable: false },
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        error: false
      }
    },
    css: {
      compiler: {
        enable: true,
        module: 'less'
      }
    },
    ...overrides
  }
}

// runs a build and reports how many times the preprocessor ran during it
async function build (overrides) {
  compiles = 0
  await roosevelt(baseConfig(overrides)).initServer()
  return compiles
}

describe('incremental builds', () => {
  const cssOut = path.join(appDir, 'public/css/main.css')
  const cacheFile = path.join(appDir, '.build/buildCache.json')

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(path.join(appDir, 'statics/css'))
    fs.writeFileSync(path.join(appDir, 'statics/css/main.less'), mainLess)
    fs.writeFileSync(path.join(appDir, 'statics/css/_partial.less'), partialLess)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should write a build cache to the build folder', async () => {
    await build()
    assert.strictEqual(fs.pathExistsSync(cacheFile), true)
  })

  it('should skip recompiling when nothing has changed', async () => {
    assert.ok(await build() > 0, 'the first build should have compiled something')
    assert.strictEqual(await build(), 0)
  })

  it('should recompile when the source file changes', async () => {
    await build()
    fs.writeFileSync(path.join(appDir, 'statics/css/main.less'), '@import "_partial";\nbody { height: 50%; }\n')
    assert.ok(await build() > 0)
    assert.ok(fs.readFileSync(cssOut, 'utf8').includes('50%'))
  })

  it('should recompile when an imported file changes', async () => {
    await build()
    fs.writeFileSync(path.join(appDir, 'statics/css/_partial.less'), '.partial { color: green; }\n')
    assert.ok(await build() > 0, 'editing an import should have invalidated the artifact that imports it')
    assert.ok(fs.readFileSync(cssOut, 'utf8').includes('green'))
  })

  it('should rebuild when a build artifact is deleted', async () => {
    await build()
    fs.removeSync(cssOut)
    assert.ok(await build() > 0)
    assert.strictEqual(fs.pathExistsSync(cssOut), true)
  })

  it('should rebuild when a build artifact is modified outside of roosevelt', async () => {
    await build()
    fs.appendFileSync(cssOut, '\n/* tampered with */')
    assert.ok(await build() > 0)
    assert.strictEqual(fs.readFileSync(cssOut, 'utf8').includes('tampered'), false)
  })

  it('should rebuild when a param that affects output changes', async () => {
    await build()
    assert.strictEqual(await build(), 0, 'the cache should be warm before changing a param')
    assert.ok(await build({ css: { compiler: { enable: true, module: 'less' }, minifier: { enable: false } } }) > 0)
  })

  it('should not skip anything when the feature is disabled', async () => {
    await build()
    assert.ok(await build({ incrementalBuilds: false }) > 0)
  })

  it('should not write a build cache when the feature is disabled', async () => {
    await build({ incrementalBuilds: false })
    assert.strictEqual(fs.pathExistsSync(cacheFile), false)
  })

  // each preprocessor reports the files it pulled in differently, so the wiring for all three is covered rather than just the one the counter above watches
  const importCases = [
    { module: 'sass', partial: '_partial.scss', entry: 'main.scss', partialBefore: '$c: red;\n', partialAfter: '$c: blue;\n', entrySource: '@use "partial";\nbody { color: partial.$c; }\n' },
    { module: 'stylus', partial: 'partial.styl', entry: 'main.styl', partialBefore: '$c = red\n', partialAfter: '$c = blue\n', entrySource: '@import "partial"\nbody\n  color $c\n' }
  ]

  for (const testCase of importCases) {
    it(`should recompile when an imported ${testCase.module} file changes`, async () => {
      // this suite's default fixtures are less files, so swap in ones for the preprocessor under test
      fs.rmSync(path.join(appDir, 'statics/css'), { recursive: true, force: true })
      fs.ensureDirSync(path.join(appDir, 'statics/css'))
      fs.writeFileSync(path.join(appDir, 'statics/css', testCase.partial), testCase.partialBefore)
      fs.writeFileSync(path.join(appDir, 'statics/css', testCase.entry), testCase.entrySource)

      const overrides = { css: { compiler: { enable: true, module: testCase.module } } }
      await build(overrides)
      fs.writeFileSync(path.join(appDir, 'statics/css', testCase.partial), testCase.partialAfter)
      await build(overrides)

      const compiled = fs.readFileSync(cssOut, 'utf8')
      assert.ok(/blue|#00f/i.test(compiled), `editing an imported ${testCase.module} file should have rebuilt the file that imports it, got: ${compiled}`)
    })
  }
})
