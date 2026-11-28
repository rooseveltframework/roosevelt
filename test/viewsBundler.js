const { describe, it, afterEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const htmlMinifier = require('html-minifier-terser').minify
const roosevelt = require('../roosevelt')
const minifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
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
    csrfProtection: false,
    expressSession: false
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
    // a bundle a test required stays in node's cache under the same path the next test writes its own to, so every one is dropped here, whether or not the test that required it got as far as cleaning up
    for (const file of Object.keys(require.cache)) {
      if (file.startsWith(appDir + path.sep)) delete require.cache[file]
    }
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // a fresh read of a bundle, since one required earlier in the same test would otherwise be handed back as it was
  function readBundle (file) {
    delete require.cache[require.resolve(file)]
    return require(file)
  }

  it('should not add the allowlist comments to the allowlist param, so building again does not add them twice', async () => {
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/allowedComment.html'), '<!-- roosevelt-allowlist allowed.js -->\n<p>from a comment</p>')

    const app = roosevelt({
      ...appConfig,
      incrementalBuilds: false,
      clientViews: {
        enable: true,
        allowlist: {
          'allowed.js': ['aTemplate.html']
        }
      }
    })

    await app.initServer()

    // what a rebuild in watch mode does, after the comment has been taken off the template
    await fs.outputFile(path.join(appDir, 'mvc/views/allowedComment.html'), '<p>no longer allowlisted</p>')
    await require('../lib/viewsBundler')(app.expressApp)
    await require('../lib/viewsBundler')(app.expressApp)

    assert.deepStrictEqual(app.expressApp.get('params').clientViews.allowlist, { 'allowed.js': ['aTemplate.html'] }, 'expected the allowlist param to be left as the app set it')
    const bundle = readBundle(path.join(appDir, '.build/js/allowed.js'))
    assert.deepStrictEqual(Object.keys(bundle), ['aTemplate.html'], 'expected a template whose comment was removed to drop out of the bundle')
  })

  it('should add an allowlist comment to a bundle the allowlist param gives as a single glob', async () => {
    await fs.outputFile(path.join(appDir, 'mvc/views/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/allowedComment.html'), '<!-- roosevelt-allowlist allowed.js -->\n<p>from a comment</p>')

    const app = roosevelt({
      ...appConfig,
      clientViews: {
        enable: true,
        allowlist: {
          'allowed.js': 'aTemplate.html'
        }
      }
    })

    await app.initServer()

    const bundle = readBundle(path.join(appDir, '.build/js/allowed.js'))
    assert.deepStrictEqual(Object.keys(bundle).sort(), ['aTemplate.html', 'allowedComment.html'])
  })

  it('should not minify pug templates, which minifying would break', async () => {
    const pugTemplate = 'div\n  p hello\n  p world'
    await fs.outputFile(path.join(appDir, 'mvc/views/aPugTemplate.pug'), pugTemplate)

    const app = roosevelt({
      ...appConfig,
      viewEngine: 'pug: pug',
      clientViews: {
        enable: true,
        exposeAll: true,
        minify: true,
        minifyOptions
      }
    })

    await app.initServer()

    const bundle = readBundle(path.join(appDir, '.build/js/views.js'))
    assert.strictEqual(bundle.aPugTemplate, pugTemplate, 'expected the pug template to be bundled as written')
  })

  it('should take the view engine extension off template names, and only that extension', async () => {
    await fs.outputFile(path.join(appDir, 'mvc/views/nested/aTemplate.html'), sampleTemplate)
    await fs.outputFile(path.join(appDir, 'mvc/views/page.xhtml'), anotherSampleTemplate)

    const app = roosevelt({
      ...appConfig,
      viewEngine: 'html: teddy',
      clientViews: {
        enable: true,
        exposeAll: true
      }
    })

    await app.initServer()

    const bundle = readBundle(path.join(appDir, '.build/js/views.js'))
    assert.deepStrictEqual(Object.keys(bundle).sort(), ['nested/aTemplate', 'page.xhtml'])
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/allowed.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/allowed.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['nested/aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')
    assert.strictEqual(bundle['nested/anotherTemplate.html'], anotherSampleTemplate.trim(), 'Expected anotherTemplate.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')
    assert.strictEqual(bundle['nest/allowed.html'], anotherSampleTemplate.trim(), 'Expected nest/allowed.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/coolBundle.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['allowed.html'], sampleTemplate.trim(), 'Expected allowed.html template to be included in the bundle!')
    assert.strictEqual(bundle['nest/allowed.html'], anotherSampleTemplate.trim(), 'Expected nest/allowed.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['allowlistedTemplate.html'], allowlistedTemplate.trim(), 'Expected allowlistedTemplate.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')
    assert.strictEqual(bundle['anotherTemplate.html'], anotherSampleTemplate.trim(), 'Expected anotherTemplate.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 2, 'Expected two template bundles to be written!')
    const firstBundle = require(path.join(appDir, '.build/js/allowed.js'))
    assert.strictEqual(Object.keys(firstBundle).length, 1, 'Expected a single template in the first bundle!')
    assert.strictEqual(firstBundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the first bundle!')
    const secondBundle = require(path.join(appDir, '.build/js/output.js'))
    assert.strictEqual(Object.keys(secondBundle).length, 1, 'Expected a single template in the second bundle!')
    assert.strictEqual(secondBundle['allowedComment.html'], allowlistedTemplate.trim(), 'Expected allowedComment.html template to be included in the second bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/templateBundles'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/templateBundles/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], sampleTemplate.trim(), 'Expected aTemplate.html template to be included in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aMiniTemplate.html'], await htmlMinifier(allowlistedTemplate, minifyOptions), 'Expected aMiniTemplate.html template to be minified in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/output.js'))
    assert.strictEqual(Object.keys(bundle).length, 1, 'Expected a single template in the bundle!')
    assert.strictEqual(bundle['aMiniTemplate.html'], await htmlMinifier(allowlistedTemplate, minifyOptions), 'Expected aMiniTemplate.html template to be minified in the bundle!')
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

    assert.strictEqual((await fs.readdir(path.join(appDir, '.build/js'))).length, 1, 'Expected a single template bundle to be written!')
    const bundle = require(path.join(appDir, '.build/js/views.js'))
    assert.strictEqual(Object.keys(bundle).length, 2, 'Expected two templates in the bundle!')
    assert.strictEqual(bundle['aTemplate.html'], `${sampleTemplate.trim()} <p>Appended stuff!</p>`, 'Expected aTemplate.html template to be included in the bundle and include preprocessing!')
    assert.strictEqual(bundle['anotherTemplate.html'], `${anotherSampleTemplate.trim()} <p>Appended stuff!</p>`, 'Expected anotherTemplate.html template to be included in the bundle and include preprocessing!')
  })
})
