const { describe, it, after, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const gitignoreScanner = require('../lib/tools/gitignoreScanner')

describe('statics pipeline', () => {
  const appDir = path.join(__dirname, 'app/staticsPipeline')

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

  // captures everything roosevelt writes to the console while it initializes
  async function captureInit (config) {
    let captured = ''
    captureLogs.start()
    try {
      await roosevelt(config).initServer()
    } finally {
      captured = captureLogs.stop()
    }
    return captured
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('gitignore scanner', () => {
    const gitignorePath = path.join(appDir, '.gitignore')

    it('should return the built in list when there is no gitignore to read', () => {
      const list = gitignoreScanner(path.join(appDir, 'nonexistent.gitignore'))

      assert.ok(list.includes('node_modules'))
      assert.ok(list.includes('Thumbs.db'))
    })

    it('should return only directories when asked for the dir type', () => {
      const list = gitignoreScanner(path.join(appDir, 'nonexistent.gitignore'), 'dir')

      assert.ok(list.includes('node_modules'))
      assert.strictEqual(list.includes('Thumbs.db'), false, 'files should not be in the dir list')
    })

    it('should return only files when asked for the file type', () => {
      const list = gitignoreScanner(path.join(appDir, 'nonexistent.gitignore'), 'file')

      assert.ok(list.includes('Thumbs.db'))
      assert.strictEqual(list.includes('node_modules'), false, 'directories should not be in the file list')
    })

    it('should add entries found in the gitignore', () => {
      fs.writeFileSync(gitignorePath, 'somefolder\nanotherfolder\n')

      const list = gitignoreScanner(gitignorePath)

      assert.ok(list.includes('somefolder'))
      assert.ok(list.includes('anotherfolder'))
    })

    it('should skip blank lines and comments in the gitignore', () => {
      fs.writeFileSync(gitignorePath, '\n# a comment\n   \nkeepme\n')

      const list = gitignoreScanner(gitignorePath)

      assert.ok(list.includes('keepme'))
      assert.strictEqual(list.includes('# a comment'), false)
      assert.strictEqual(list.includes(''), false)
    })

    it('should skip source file types so that they are still processed', () => {
      fs.writeFileSync(gitignorePath, 'bundle.js\nstyles.css\nmain.less\ncomponent.jsx\ntypes.ts\n')

      const list = gitignoreScanner(gitignorePath)

      for (const entry of ['bundle.js', 'styles.css', 'main.less', 'component.jsx', 'types.ts']) {
        assert.strictEqual(list.includes(entry), false, `${entry} should not be ignored`)
      }
    })

    it('should drop wildcard entries and reduce the rest to their basename', () => {
      fs.writeFileSync(gitignorePath, '*.log\nsome/nested/folder\n')

      const list = gitignoreScanner(gitignorePath)

      assert.strictEqual(list.includes('*.log'), false, 'wildcard entries should be dropped')
      assert.ok(list.includes('folder'), 'nested paths should be reduced to their basename')
    })

    it('should not duplicate entries already in the built in list', () => {
      fs.writeFileSync(gitignorePath, 'node_modules\nnode_modules\n')

      const list = gitignoreScanner(gitignorePath)

      assert.strictEqual(list.filter(entry => entry === 'node_modules').length, 1)
    })
  })

  describe('copy files', () => {
    it('should copy a file to the destination', async () => {
      fs.outputFileSync(path.join(appDir, 'source/thing.txt'), 'copy me')

      await roosevelt({ ...appConfig, copy: [{ source: 'source/thing.txt', dest: 'public/thing.txt' }] }).initServer()

      assert.strictEqual(fs.readFileSync(path.join(appDir, 'public/thing.txt'), 'utf8'), 'copy me')
    })

    it('should copy a whole folder to the destination', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      fs.outputFileSync(path.join(appDir, 'source/nested/b.txt'), 'b')

      await roosevelt({ ...appConfig, copy: [{ source: 'source/nested', dest: 'public/nested' }] }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/nested/a.txt')))
      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/nested/b.txt')))
    })

    it('should accept absolute paths', async () => {
      const source = path.join(appDir, 'source/absolute.txt')
      const dest = path.join(appDir, 'public/absolute.txt')
      fs.outputFileSync(source, 'absolute')

      await roosevelt({ ...appConfig, copy: [{ source, dest }] }).initServer()

      assert.strictEqual(fs.readFileSync(dest, 'utf8'), 'absolute')
    })

    it('should log an error when the copy source does not exist', async () => {
      let captured = ''
      captureLogs.start()
      try {
        await roosevelt({
          ...appConfig,
          logging: { methods: { http: false, info: false, warn: false, verbose: false } },
          copy: [{ source: 'source/missing.txt', dest: 'public/missing.txt' }]
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('does not exist'), `expected a missing source error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should not copy anything when makeBuildArtifacts is false', async () => {
      fs.outputFileSync(path.join(appDir, 'source/thing.txt'), 'copy me')

      await roosevelt({ ...appConfig, makeBuildArtifacts: false, copy: [{ source: 'source/thing.txt', dest: 'public/thing.txt' }] }).initServer()

      assert.strictEqual(fs.pathExistsSync(path.join(appDir, 'public/thing.txt')), false)
    })
  })

  describe('views and statics preprocessor', () => {
    it('should create the preprocessed views directory', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/views/index.html'), '<p>a view</p>')

      await roosevelt({ ...appConfig, viewEngine: 'html: teddy' }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, '.build/preprocessed_views')))
    })

    it('should copy views into the preprocessed views directory', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/views/index.html'), '<p>a view</p>')

      await roosevelt({ ...appConfig, viewEngine: 'html: teddy' }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, '.build/preprocessed_views/index.html')))
    })

    it('should not preprocess anything when makeBuildArtifacts is false', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/views/index.html'), '<p>a view</p>')

      await roosevelt({ ...appConfig, makeBuildArtifacts: false, viewEngine: 'html: teddy' }).initServer()

      assert.strictEqual(fs.pathExistsSync(path.join(appDir, '.build/preprocessed_views')), false)
    })

    it('should create the preprocessed statics directories when minifyHtmlAttributes is enabled in development', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/views/index.html'), '<p>a view</p>')
      fs.outputFileSync(path.join(appDir, 'statics/css/styles.css'), 'body { color: red; }')
      fs.outputFileSync(path.join(appDir, 'statics/js/main.js'), 'const a = 1')

      await roosevelt({
        ...appConfig,
        mode: 'development',
        viewEngine: 'html: teddy',
        minifyHtmlAttributes: { enable: 'development' }
      }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, '.build/preprocessed_statics')))
    })

    it('should minify html attributes when the feature is enabled', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/views/index.html'), '<html><body><p class="a-very-long-class-name">hi</p></body></html>')
      fs.outputFileSync(path.join(appDir, 'statics/css/styles.css'), '.a-very-long-class-name { color: red; }')
      fs.outputFileSync(path.join(appDir, 'statics/js/main.js'), 'const a = 1')

      await roosevelt({
        ...appConfig,
        mode: 'development',
        viewEngine: 'html: teddy',
        minifyHtmlAttributes: { enable: 'development' }
      }).initServer()

      const preprocessed = fs.readFileSync(path.join(appDir, '.build/preprocessed_views/index.html'), 'utf8')
      assert.strictEqual(preprocessed.includes('a-very-long-class-name'), false, `expected the long class name to be minified away, got: ${preprocessed}`)
    })
  })

  describe('generate symlinks', () => {
    it('should create a symlink from source to destination', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/logo.png'), 'not really a png')

      await roosevelt({ ...appConfig, symlinks: [{ source: 'statics/images', dest: 'public/images' }] }).initServer()

      assert.ok(fs.lstatSync(path.join(appDir, 'public/images')).isSymbolicLink())
    })

    it('should skip making a symlink that already exists', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/logo.png'), 'not really a png')
      const config = { ...appConfig, symlinks: [{ source: 'statics/images', dest: 'public/images' }] }

      await roosevelt(config).initServer()
      await roosevelt(config).initServer() // second run should leave the existing symlink alone

      assert.ok(fs.lstatSync(path.join(appDir, 'public/images')).isSymbolicLink())
    })

    it('should log an error when the symlink source does not exist', async () => {
      const captured = await captureInit({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        symlinks: [{ source: 'statics/missing', dest: 'public/missing' }]
      })

      assert.ok(captured.includes('does not exist'), `expected a missing source error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should log an error when the symlink destination is already a real file', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/logo.png'), 'not really a png')
      fs.outputFileSync(path.join(appDir, 'public/images'), 'i am a file, not a symlink')

      const captured = await captureInit({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        symlinks: [{ source: 'statics/images', dest: 'public/images' }]
      })

      assert.ok(captured.includes('already a file that exists'), `expected a destination conflict error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should remove broken symlinks from the public folder', async () => {
      // a symlink pointing at something that does not exist
      fs.ensureDirSync(path.join(appDir, 'public'))
      fs.symlinkSync(path.join(appDir, 'statics/gone'), path.join(appDir, 'public/broken'))

      await roosevelt({ ...appConfig }).initServer()

      assert.strictEqual(fs.existsSync(path.join(appDir, 'public/broken')), false, 'the broken symlink should have been removed')
    })

    it('should warn that no build artifacts are made when makeBuildArtifacts is false', async () => {
      const captured = await captureInit({
        ...appConfig,
        makeBuildArtifacts: false,
        logging: { methods: { http: false, info: false, verbose: false } }
      })

      assert.ok(captured.includes('will not generate build artifacts'), `expected a warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })
  })
})
