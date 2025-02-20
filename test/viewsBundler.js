/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const htmlMinifier = require('html-minifier-terser').minify
const roosevelt = require('../roosevelt')
const minifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  remoaveAttributeQuotes: true,
  removeEmptyAttributes: true
}

describe('views bundler', () => {
  const appDir = path.join(__dirname, 'app/viewsBundler')
  const appConfig = {
    appDir,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        verbose: false
      }
    },
    makeBuildArtifacts: true,
    csrfProtection: false
  }

  const sampleTemplate = `
    <p>I'm going to be bundled!</p>
  `

  const anotherSampleTemplate = `
    <h1>Being in a bundle is cool!</h1>
  `

  const allowlistedTemplate = `
    <!-- roosevelt-allowlist output.js -->
    <h1>Hello World</h1>
    <p>The first line makes me a VIP!</p>
  `

  const blocklistedTemplate = `
    <!-- roosevelt-blocklist -->
    <p>Oh no I've been banned!</p>
  `

  afterEach(async () => {
    await fs.remove(appDir)
  })

  it('should bundle templates in allowlist while ignoring templates in the blocklist', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/allowed.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), sampleTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        allowlist: {
          'allowed.js': ['**/**']
        },
        blocklist: ['blocked.html']
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/allowed.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/allowed.js'))]
  })

  it('should bundle a directory of templates when allowlist references a directory', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/notNested.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/nested/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/nested/anotherTemplate.html'), anotherSampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/nested/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        allowlist: {
          'allowed.js': ['nested/**']
        }
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/allowed.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['nested/aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')
    assert.strictEqual(bundle['nested/anotherTemplate.html'], anotherSampleTemplate.trim(), 'Expected anotherTemplate.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/allowed.js'))]
  })

  it('should bundle all templates except contents of the blocklist when exposeAll is enabled', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/allowed.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/nest/allowed.html'), anotherSampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), sampleTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        blocklist: ['blocked.html']
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')
    assert.strictEqual(bundle['nest/allowed.html'], anotherSampleTemplate.trim(), 'Expected nest/allowed.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/views.js'))]
  })

  it('should respect defaultBundle setting when exposeAll is enabled', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/allowed.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/nest/allowed.html'), anotherSampleTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        defaultBundle: 'coolBundle.js'
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/coolBundle.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')
    assert.strictEqual(bundle['nest/allowed.html'], anotherSampleTemplate.trim(), 'Expected nest/allowed.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/coolBundle.js'))]
  })

  it('should exclusively bundle allowlist commented templates when exposeAll is enabled', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/allowlistedTemplate.html'), allowlistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['allowlistedTemplate.html'], allowlistedTemplate.trim(), 'Expected allowlistedTemplate.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/output.js'))]
  })

  it('should bundle every template except for blocklist commented ones when exposeAll is enabled', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/anotherTemplate.html'), anotherSampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')
    assert.strictEqual(bundle['anotherTemplate.html'], anotherSampleTemplate.trim(), 'Expected anotherTemplate.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/views.js'))]
  })

  it('should create multiple bundles via a combination of allowlist config and template comments', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/allowedComment.html'), allowlistedTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/anotherBlocked.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blockedComment.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        allowlist: {
          'allowed.js': ['aTemplate.html', 'blockedComment.html']
        },
        blocklist: ['anotherBlocked.html']
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 2, 'Expected two template bundles to be written!')
    const firstBundle = require(path.join(appDir, 'public/js/allowed.js'))
    assert.strictEqual(Object.keys(firstBundle).length, 1, 'Expected a single template in the first bundle!')
    assert.strictEqual(firstBundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the first bundle!')
    const secondBundle = require(path.join(appDir, 'public/js/output.js'))
    assert.strictEqual(Object.keys(firstBundle).length, 1, 'Expected a single template in the second bundle!')
    assert.strictEqual(secondBundle['allowedComment.html'], allowlistedTemplate.trim(), 'Expected allowedComment.html template to be included in the second bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/allowed.js'))]
    delete require.cache[require.resolve(path.join(appDir, 'public/js/output.js'))]
  })

  it('should write bundle to configured output directory', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true,
        output: 'templateBundles'
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/templateBundles'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/templateBundles/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/templateBundles/views.js'))]
  })

  it('should minify bundled templates when minifier is enabled', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aMiniTemplate.html'), allowlistedTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        minify: true,
        minifyOptions
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aMiniTemplate.html'], await htmlMinifier(allowlistedTemplate, minifyOptions), 'Expected aMiniTemplate.html template to be minified in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/output.js'))]
  })

  it('should minify templates with top level html minifier options if no minifyOptions are specified', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aMiniTemplate.html'), allowlistedTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      html: {
        minifier: {
          enable: true,
          options: minifyOptions
        }
      },
      clientViews: {
        enable: true,
        minify: true
      }
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aMiniTemplate.html'], await htmlMinifier(allowlistedTemplate, minifyOptions), 'Expected aMiniTemplate.html template to be minified in the bundle!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/output.js'))]
  })

  it('should process templates prior to bundling when providing a onClientViewsProcess method', async () => {
    // write some templates
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/anotherTemplate.html'), anotherSampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/blocked.html'), blocklistedTemplate)

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        exposeAll: true
      },
      onClientViewsProcess: template => `${template} <p>Appended stuff!</p>`
    })

    await app.initServer()

    assert.strictEqual((await fs.readdir(path.join(appDir, 'public/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, 'public/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], `${sampleTemplate.trim()} <p>Appended stuff!</p>`, 'Expected aTemplate.html template to be included in the bundle and include preprocessing!')
    assert.strictEqual(bundle['anotherTemplate.html'], `${anotherSampleTemplate.trim()} <p>Appended stuff!</p>`, 'Expected anotherTemplate.html template to be included in the bundle and include preprocessing!')

    // wiping the bundle reference out of the require cache is necessary to avoid test environment pollution
    delete require.cache[require.resolve(path.join(appDir, 'public/js/views.js'))]
  })
})
