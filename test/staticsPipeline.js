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

  describe('the onBeforeStatics event', () => {
    it('should fire before anything has been written', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/teddy.txt'), 'an image stands in')
      let publicFolderExisted = null
      let copyExisted = null

      await roosevelt({
        ...appConfig,
        copy: [{ source: 'statics/images/teddy.txt', dest: 'public/teddy.txt' }],
        onBeforeStatics: () => {
          publicFolderExisted = fs.pathExistsSync(path.join(appDir, 'public/css'))
          copyExisted = fs.pathExistsSync(path.join(appDir, 'public/teddy.txt'))
        }
      }).initServer()

      assert.strictEqual(copyExisted, false, 'the copy step must not have run yet when the event fires')
      assert.strictEqual(publicFolderExisted, false, 'nothing must have been written into the public folder yet when the event fires')

      // and the build still happened afterwards
      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/teddy.txt')))
    })

    it('should be able to add a copy that then gets made', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/late.txt'), 'added by the event')

      await roosevelt({
        ...appConfig,
        onBeforeStatics: (app) => {
          // firing before anything is written is what makes this possible
          app.get('params').copy.push({ source: 'statics/images/late.txt', dest: 'public/late.txt' })
        }
      }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/late.txt')), 'expected the copy the event added to have been made')
      assert.strictEqual(fs.readFileSync(path.join(appDir, 'public/late.txt'), 'utf8'), 'added by the event')
    })

    it('should be able to add a symlink that then gets made', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/images/teddy.txt'), 'an image stands in')

      await roosevelt({
        ...appConfig,
        onBeforeStatics: (app) => {
          app.get('params').symlinks.push({ source: path.join(appDir, 'statics/images'), dest: path.join(appDir, 'public/images') })
        }
      }).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/images/teddy.txt')), 'expected the symlink the event added to have been made')
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

    it('should skip the copy on a second start when nothing changed', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      const config = { ...appConfig, copy: [{ source: 'source/nested', dest: 'public/nested' }] }

      const first = await captureInit({ ...config, logging: { methods: { http: false, warn: false, error: false, verbose: false } } })
      const second = await captureInit({ ...config, logging: { methods: { http: false, warn: false, error: false, verbose: false } } })

      assert.ok(first.includes('copying'), `expected the first start to copy, got: ${JSON.stringify(first.slice(0, 300))}`)
      assert.ok(!second.includes('copying'), `expected the second start to skip the copy, got: ${JSON.stringify(second.slice(0, 300))}`)
    })

    it('should copy again on a second start when a source file changed', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      const config = { ...appConfig, copy: [{ source: 'source/nested', dest: 'public/nested' }] }

      await roosevelt(config).initServer()
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'edited')
      await roosevelt(config).initServer()

      assert.strictEqual(fs.readFileSync(path.join(appDir, 'public/nested/a.txt'), 'utf8'), 'edited')
    })

    it('should copy again on a second start when a source file is added', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      const config = { ...appConfig, copy: [{ source: 'source/nested', dest: 'public/nested' }] }

      await roosevelt(config).initServer()
      fs.outputFileSync(path.join(appDir, 'source/nested/b.txt'), 'b')
      await roosevelt(config).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/nested/b.txt')))
    })

    it('should copy again on a second start when the destination was deleted', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      const config = { ...appConfig, copy: [{ source: 'source/nested', dest: 'public/nested' }] }

      await roosevelt(config).initServer()
      fs.rmSync(path.join(appDir, 'public/nested'), { recursive: true, force: true })
      await roosevelt(config).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/nested/a.txt')))
    })

    it('should copy on every start when incrementalBuilds is off', async () => {
      fs.outputFileSync(path.join(appDir, 'source/nested/a.txt'), 'a')
      const config = { ...appConfig, incrementalBuilds: false, copy: [{ source: 'source/nested', dest: 'public/nested' }], logging: { methods: { http: false, warn: false, error: false, verbose: false } } }

      await captureInit(config)
      const second = await captureInit(config)

      assert.ok(second.includes('copying'), `expected the copy to run again, got: ${JSON.stringify(second.slice(0, 300))}`)
    })

    it('should report why a copy failed', async () => {
      // a directory where the destination file should go makes fs-extra throw with a reason worth reporting
      fs.outputFileSync(path.join(appDir, 'source/thing.txt'), 'copy me')
      fs.ensureDirSync(path.join(appDir, 'public/thing.txt'))

      const captured = await captureInit({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        copy: [{ source: 'source/thing.txt', dest: 'public/thing.txt' }]
      })

      assert.ok(captured.includes('Error copying'), `expected a copy error, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(captured.includes('Cannot overwrite directory'), `expected the underlying reason to be included, got: ${JSON.stringify(captured.slice(0, 300))}`)
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

  describe('building without serving', () => {
    // startServer serves a staticsOnly app as of 0.33.0, where it used to build and then stop short of listening
    // init is what builds without listening, and a build step in ci or a deploy has to finish and exit rather than sit on a port
    it('should build a static site without starting a server', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/pages/index.html'), '<p>a static site</p>')

      const app = roosevelt({
        ...appConfig,
        makeBuildArtifacts: 'staticsOnly',
        viewEngine: 'html: teddy',
        http: { enable: true, port: 30141 }
      })
      await app.init()

      assert.ok(fs.readFileSync(path.join(appDir, 'public/index.html'), 'utf8').includes('a static site'), 'the site should have been built')
      await assert.rejects(fetch('http://localhost:30141/'), 'nothing should be listening on the port it would have used')

      // init builds the server object but never binds it, which is the difference between it and startServer
      assert.strictEqual(app.expressApp.get('httpServer').listening, false)
    })

    it('should build and stop there when buildOnly is set, which is what the --build flag sets', async () => {
      // --build has always meant build the app and do not serve it
      // this is deliberately separate from makeBuildArtifacts, which says what gets built rather than whether it is served
      fs.outputFileSync(path.join(appDir, 'statics/pages/index.html'), '<p>a static site</p>')

      const app = roosevelt({
        ...appConfig,
        makeBuildArtifacts: 'staticsOnly',
        buildOnly: true,
        viewEngine: 'html: teddy',
        http: { enable: true, port: 30143 }
      })
      await app.startServer()

      assert.ok(fs.readFileSync(path.join(appDir, 'public/index.html'), 'utf8').includes('a static site'), 'the site should have been built')
      await assert.rejects(fetch('http://localhost:30143/'), 'startServer should not have listened')
      assert.strictEqual(app.expressApp.get('httpServer').listening, false)
    })

    it('should serve a static site that has not asked for a build only run', async () => {
      // being a static site is not the same as being a build, so this one does listen
      fs.outputFileSync(path.join(appDir, 'statics/pages/index.html'), '<p>a static site</p>')

      // development mode so that shutting down destroys the connection this test opens rather than waiting on it
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        makeBuildArtifacts: 'staticsOnly',
        frontendReload: { enable: false },
        viewEngine: 'html: teddy',
        http: { enable: true, port: 30144 }
      })
      await app.startServer()

      const res = await fetch('http://localhost:30144/')
      assert.strictEqual(res.status, 200)
      assert.ok((await res.text()).includes('a static site'))

      await app.stopServer({ persistProcess: true })
    })

    it('should build an app that is not a static site without starting a server either', async () => {
      fs.outputFileSync(path.join(appDir, 'statics/css/main.css'), 'p { color: red; }')

      const app = roosevelt({
        ...appConfig,
        viewEngine: 'html: teddy',
        http: { enable: true, port: 30142 }
      })
      await app.init()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public')), 'the build should have run')
      await assert.rejects(fetch('http://localhost:30142/'), 'nothing should be listening on the port it would have used')

      assert.strictEqual(app.expressApp.get('httpServer').listening, false)
    })
  })
})
