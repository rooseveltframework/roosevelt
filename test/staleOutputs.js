const { describe, it, after, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

// a file roosevelt built from a source that has since been deleted used to be left behind, and went on being served
//
// these check that such a file is removed, and that roosevelt only ever removes files it wrote itself
describe('outputs of deleted sources', () => {
  const appDir = path.join(__dirname, 'app/staleOutputs')
  const publicDir = path.join(appDir, 'public')

  function config (overrides = {}) {
    return {
      appDir,
      mode: 'production',
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      http: { enable: false },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      viewEngine: 'html: teddy',
      html: { sourcePath: 'pages' },
      css: { compiler: { enable: true, module: 'less' } },
      copy: [{ source: 'source/nested', dest: 'public/nested' }, { source: 'source/single.txt', dest: 'public/single.txt' }],
      clientModels: { enable: true, exposeAll: true },
      ...overrides
    }
  }

  const build = overrides => roosevelt(config(overrides)).initServer()
  const write = (file, contents) => fs.outputFileSync(path.join(appDir, file), contents)
  const remove = file => fs.removeSync(path.join(appDir, file))
  const exists = file => fs.pathExistsSync(path.join(appDir, file))

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    write('source/nested/keep.txt', 'keep')
    write('source/nested/gone.txt', 'gone')
    write('source/single.txt', 'single')
    write('statics/pages/index.html', '<p>index</p>')
    write('statics/pages/gone.html', '<p>gone</p>')
    write('statics/css/main.less', '.fromMain { color: red; }\n')
    write('statics/css/gone.less', '.fromGone { color: blue; }\n')
    write('mvc/models/keep.js', 'module.exports = () => ({})\n')
    write('mvc/models/gone.js', 'module.exports = () => ({})\n')
    write('mvc/views/keep.html', '<p>keep</p>')
    write('mvc/views/gone.html', '<p>gone</p>')
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should remove a copied file whose source was deleted, but keep the rest of the copy', async () => {
    await build()
    assert.ok(exists('public/nested/gone.txt'), 'the first build should have copied the file')

    remove('source/nested/gone.txt')
    await build()

    assert.strictEqual(exists('public/nested/gone.txt'), false, 'the copy of the deleted file should have been removed')
    assert.ok(exists('public/nested/keep.txt'), 'the copy of a file that still exists should be kept')
  })

  it('should remove a copied file whose copy source no longer exists at all', async () => {
    await build()
    assert.ok(exists('public/single.txt'))

    remove('source/single.txt')
    await build()

    assert.strictEqual(exists('public/single.txt'), false, 'the copy of the deleted source should have been removed')
  })

  it('should remove a page whose source was deleted', async () => {
    await build()
    assert.ok(exists('public/gone.html'), 'the first build should have written the page')

    remove('statics/pages/gone.html')
    await build()

    assert.strictEqual(exists('public/gone.html'), false, 'the page of the deleted source should have been removed')
    assert.ok(exists('public/index.html'), 'a page whose source still exists should be kept')
  })

  it('should remove the css of a stylesheet that was deleted', async () => {
    await build()
    assert.ok(exists('public/css/gone.css'), 'the first build should have compiled the stylesheet')

    remove('statics/css/gone.less')
    await build()

    assert.strictEqual(exists('public/css/gone.css'), false, 'the css of the deleted stylesheet should have been removed')
    assert.ok(exists('public/css/main.css'), 'the css of a stylesheet that still exists should be kept')
  })

  it('should keep css that a different, still existing stylesheet now produces', async () => {
    const allowlisted = name => ({ css: { compiler: { enable: true, module: 'less' }, allowlist: [`${name}:shared.css`] } })
    await build(allowlisted('gone.less'))
    assert.ok(fs.readFileSync(path.join(publicDir, 'css/shared.css'), 'utf8').includes('fromGone'))

    remove('statics/css/gone.less')
    await build(allowlisted('main.less'))

    assert.ok(fs.readFileSync(path.join(publicDir, 'css/shared.css'), 'utf8').includes('fromMain'), 'the css that main.less now compiles to should be kept')
  })

  it('should remove the front end model of a model that was deleted', async () => {
    await build()
    assert.ok(exists('.build/js/models/gone.js'), 'the first build should have generated the model')

    remove('mvc/models/gone.js')
    await build()

    assert.strictEqual(exists('.build/js/models/gone.js'), false, 'the generated model of the deleted model should have been removed')
    assert.ok(exists('.build/js/models/keep.js'), 'the generated model of a model that still exists should be kept')
  })

  it('should remove every front end model once there are no models left', async () => {
    await build()
    remove('mvc/models')
    await build()

    assert.strictEqual(exists('.build/js/models/gone.js'), false)
    assert.strictEqual(exists('.build/js/models/keep.js'), false)
  })

  it('should remove a view that was deleted from the preprocessed views', async () => {
    await build()
    assert.ok(exists('.build/preprocessed_views/gone.html'), 'the first build should have copied the view')

    remove('mvc/views/gone.html')
    await build()

    assert.strictEqual(exists('.build/preprocessed_views/gone.html'), false, 'the deleted view should no longer be in the preprocessed views')
    assert.ok(exists('.build/preprocessed_views/keep.html'))
  })

  it('should not remove files in the public folder that roosevelt did not write', async () => {
    write('public/mine.txt', 'mine')
    write('public/nested/mine.txt', 'mine')
    write('public/css/mine.css', 'mine')
    await build()

    remove('source/nested')
    remove('statics/css/gone.less')
    remove('statics/pages/gone.html')
    await build()

    assert.strictEqual(exists('public/nested/keep.txt'), false, 'the copies of the deleted folder should have been removed')
    assert.strictEqual(fs.readFileSync(path.join(publicDir, 'mine.txt'), 'utf8'), 'mine')
    assert.strictEqual(fs.readFileSync(path.join(publicDir, 'nested/mine.txt'), 'utf8'), 'mine')
    assert.strictEqual(fs.readFileSync(path.join(publicDir, 'css/mine.css'), 'utf8'), 'mine')
  })

  it('should not remove an output that was edited since roosevelt wrote it', async () => {
    await build()
    fs.appendFileSync(path.join(publicDir, 'gone.html'), '<!-- edited by hand -->')

    remove('statics/pages/gone.html')
    await build()

    assert.ok(exists('public/gone.html'), 'a file that is no longer what roosevelt wrote is not roosevelt\'s to remove')
  })

  it('should remove nothing on a build with no build cache to go on', async () => {
    await build()
    remove('.build/buildCache.json')
    remove('statics/pages/gone.html')
    remove('statics/css/gone.less')
    remove('source/nested/gone.txt')
    await build()

    assert.ok(exists('public/gone.html'))
    assert.ok(exists('public/css/gone.css'))
    assert.ok(exists('public/nested/gone.txt'))
  })

  it('should still remove outputs after a config change has invalidated the build cache', async () => {
    await build()
    remove('statics/pages/gone.html')
    await build({ html: { sourcePath: 'pages', minifier: { enable: false } } })

    assert.strictEqual(exists('public/gone.html'), false)
  })

  it('should remove nothing when incremental builds are disabled', async () => {
    await build({ incrementalBuilds: false })
    remove('statics/pages/gone.html')
    await build({ incrementalBuilds: false })

    assert.ok(exists('public/gone.html'))
  })
})
