const { describe, it, before, afterEach } = require('node:test')
const rooseveltConfig = require('../config')
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const sampleConfig = require('./util/sampleConfig.json')
const config = {
  logging: {
    methods: {
      http: false,
      info: false,
      warn: false,
      verbose: false
    }
  },
  csrfProtection: false,
  expressSession: false
}

describe('sourceParams', () => {
  describe('config objects', () => {
    // blocklist certain params from auto checking
    const blocklist = [
      'appDir',
      'cssCompiler',
      'preprocessedViewsPath',
      'preprocessedStaticsPath',
      'minifyHtmlAttributes',
      'onClientViewsProcess',
      'onServerInit',
      'onBeforeMiddleware',
      'onBeforeControllers',
      'onBeforeStatics',
      'onStaticsRebuilt',
      'onServerStart',
      'onAppExit',
      'routePrefix',
      'unversionedPublic',
      'pkg'
    ]

    afterEach(async () => {
      // wipe out the test app directory
      // only this file's own directory is removed, because every test file keeps its app under test/app and removing the whole folder would delete the apps the other files are using
      fs.rmSync(path.join(__dirname, 'app/sourceParams'), { recursive: true, force: true })
    })

    describe('supplying part of an object param', () => {
      function params (options) {
        return require('../roosevelt')({ appDir: path.join(__dirname, 'app/sourceParams'), ...config, ...options }).expressApp.get('params')
      }

      it('should keep the rest of that param defaults', () => {
        // roosevelt reads logging.methods.http directly to decide whether to log requests, so losing it here switched http logging off for an app that only asked to quiet info
        const methods = params({ logging: { methods: { info: false } } }).logging.methods

        assert.strictEqual(methods.info, false, 'what the app asked for should stand')
        assert.strictEqual(methods.http, true, 'and everything it did not mention should keep its default')
        assert.strictEqual(methods.error, true)
      })

      it('should keep defaults a level below the one supplied', () => {
        const p = params({ logging: { methods: { info: false } } })

        assert.strictEqual(p.logging.quieterStartup, false, 'a sibling of the object that was supplied should survive too')
      })

      it('should fill in defaults nested inside another param', () => {
        const bodyParser = params({ bodyParser: { urlEncoded: { limit: '1mb' } } }).bodyParser

        assert.strictEqual(bodyParser.urlEncoded.limit, '1mb')
        assert.strictEqual(bodyParser.urlEncoded.extended, true, 'the default alongside it should remain')
        assert.deepStrictEqual(bodyParser.json, {}, 'and so should the sibling param')
      })

      it('should still let an app turn a default off', () => {
        assert.strictEqual(params({ logging: { methods: { http: false } } }).logging.methods.http, false)
      })

      it('should pass through options roosevelt knows nothing about', () => {
        // helmet and formidable take arbitrary options bound for those modules, so filling in defaults must not amount to a allowlist
        assert.strictEqual(params({ formidable: { maxFileSize: 99 } }).formidable.maxFileSize, 99)
        assert.strictEqual(params({ formidable: { maxFileSize: 99 } }).formidable.multiples, true, 'while still restoring the default')
      })

      it('should have the defaults in place before a ref reads them', () => {
        // refs resolve partway through sourcing, so a ref reading a sub-param the app left out has to see the default rather than nothing
        const p = params({
          logging: { methods: { info: false } },
          localhostOnly: rooseveltConfig.ref(param => param.logging.methods.http === true)
        })

        assert.strictEqual(p.localhostOnly, true, 'the ref should have seen the restored default, not undefined')
      })

      it('should fill defaults into what a ref returns, the same as a literal', () => {
        // a ref is skipped on the way in, since it is an object roosevelt replaces wholesale, so the defaults have to be filled again once it has produced a real value
        const methods = params({ logging: rooseveltConfig.ref(() => ({ methods: { info: false } })) }).logging.methods

        assert.strictEqual(methods.info, false, 'what the ref returned should stand')
        assert.strictEqual(methods.http, true, 'and the defaults it left out should be filled in')
      })
    })

    it('should set params from constructor', () => {
      // build roosevelt config from sample
      const config = {
        ...sampleConfig,
        appDir: 'value'
      }

      // initialize roosevelt
      const app = require('../roosevelt')(config)

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      config.staticsRoot = path.join(config.appDir, config.staticsRoot)
      config.modelsPath = path.join(config.appDir, config.modelsPath)
      config.viewsPath = path.join(config.appDir, config.viewsPath)
      config.controllersPath = path.join(config.appDir, config.controllersPath)
      config.secretsPath = path.join(config.appDir, config.secretsPath)
      config.buildFolder = (path.join(config.appDir, config.buildFolder))
      config.publicFolder = (path.join(config.appDir, config.publicFolder))
      config.html.sourcePath = path.join(config.staticsRoot, config.html.sourcePath)
      config.html.output = path.join(config.publicFolder, config.html.output)
      config.css.sourcePath = path.join(config.staticsRoot, config.css.sourcePath)
      config.css.output = path.join(config.publicFolder, config.css.output)
      config.js.sourcePath = path.join(config.staticsRoot, config.js.sourcePath)
      config.clientViews.output = path.join(config.staticsRoot, config.clientViews.output)
      config.clientControllers.output = path.join(config.staticsRoot, config.clientControllers.output)

      // for each param, test that its value is set in roosevelt
      for (const key in appConfig) {
        const param = appConfig[key]

        if (!blocklist.includes(key)) {
          assert.deepStrictEqual(param, config[key], `${key} was not correctly set`)
        }
      }
    })

    it('should set params from rooseveltConfig.js', () => {
      // set app directory
      const appDir = path.join(__dirname, 'app/sourceParams')

      // build roosevelt config from sample
      const configJson = {
        ...sampleConfig
      }

      // create app directory
      fs.ensureDirSync(path.join(appDir))

      // generate rooseveltConfig.js with sample config
      fs.outputFileSync(path.join(appDir, 'rooseveltConfig.js'), 'module.exports = ' + JSON.stringify(configJson))

      // initialize roosevelt
      const app = require('../roosevelt')({
        appDir
      })

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      configJson.staticsRoot = path.join(appDir, configJson.staticsRoot)
      configJson.modelsPath = path.join(appDir, configJson.modelsPath)
      configJson.viewsPath = path.join(appDir, configJson.viewsPath)
      configJson.controllersPath = path.join(appDir, configJson.controllersPath)
      configJson.secretsPath = path.join(appDir, configJson.secretsPath)
      configJson.buildFolder = (path.join(appDir, configJson.buildFolder))
      configJson.publicFolder = (path.join(appDir, configJson.publicFolder))
      configJson.html.sourcePath = path.join(configJson.staticsRoot, configJson.html.sourcePath)
      configJson.html.output = path.join(configJson.publicFolder, configJson.html.output)
      configJson.css.sourcePath = path.join(configJson.staticsRoot, configJson.css.sourcePath)
      configJson.css.output = path.join(configJson.publicFolder, configJson.css.output)
      configJson.js.sourcePath = path.join(configJson.staticsRoot, configJson.js.sourcePath)
      configJson.clientViews.output = path.join(configJson.staticsRoot, configJson.clientViews.output)
      configJson.clientControllers.output = path.join(configJson.staticsRoot, configJson.clientControllers.output)

      // for each param, test that its value is set in roosevelt
      for (const key in appConfig) {
        const param = appConfig[key]

        if (!blocklist.includes(key)) {
          assert.deepStrictEqual(param, configJson[key], `${key} was not correctly set`)
        }
      }
    })

    it('should resolve refs against the finished params', () => {
      // build roosevelt config with lots of variables
      const config = {
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        csrfProtection: false,
        http: {
          port: 4000
        },
        https: {
          // a ref returns a real number, where the old template syntax produced a string that had to be coerced back
          port: rooseveltConfig.ref(param => param.http.port + 1)
        },
        formidable: {
          multiples: rooseveltConfig.ref(param => param.versionedPublic)
        },
        css: {
          sourcePath: 'coolCss',
          allowlist: [
            rooseveltConfig.ref(param => path.join(param.css.sourcePath, 'hello.js'))
          ]
        },
        js: {
          sourcePath: 'coolJavaScript',
          bundles: [
            {
              output: rooseveltConfig.ref(param => param.css.allowlist[0])
            }
          ]
        },
        symlinks: [
          {
            source: rooseveltConfig.ref(param => param.js.sourcePath),
            dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js'))
          }
        ],
        versionedPublic: true,
        hostPublic: rooseveltConfig.ref(param => param.makeBuildArtifacts)
      }

      // initialize roosevelt
      const app = require('../roosevelt')(config)

      const appConfig = app.expressApp.get('params')

      // check against various scenarios
      assert.deepStrictEqual(appConfig.https.port, 4001, 'a ref returning a number should stay a number')
      assert.deepStrictEqual(appConfig.css.allowlist[0], path.join(appConfig.staticsRoot, 'coolCss/hello.js'), 'a ref should see params roosevelt derived, such as the resolved css source path')
      assert.deepStrictEqual(appConfig.symlinks[0].source, path.join(appConfig.staticsRoot, 'coolJavaScript'), 'a ref inside an array should resolve')
      assert.deepStrictEqual(appConfig.symlinks[0].dest, path.join(appConfig.publicFolder, 'js'), 'a ref inside an array should resolve')
      assert.deepStrictEqual(appConfig.js.bundles[0].output, path.join(appConfig.staticsRoot, 'coolCss/hello.js'), 'a ref that reads a value produced by another ref should resolve')
      assert.deepStrictEqual(appConfig.formidable.multiples, true, 'a ref returning a boolean should stay a boolean')
      assert.deepStrictEqual(appConfig.hostPublic, false, 'a ref returning false should stay false')
    })
  })

  describe('command line', () => {
    let processArgv

    before(() => {
      // backup cli flags
      processArgv = process.argv.slice()
    })

    afterEach(() => {
      // restore cli flags
      process.argv = processArgv.slice()
    })

    it('should build and not serve via --build', () => {
      // --build has always meant "build the app and stop there"
      // it sets two separate things: what gets built, and whether the app serves it afterwards
      process.argv.push('--build')

      const appConfig = require('../roosevelt')({ ...config }).expressApp.get('params')

      assert.strictEqual(appConfig.makeBuildArtifacts, 'staticsOnly')
      assert.strictEqual(appConfig.buildOnly, true)
    })

    it('should build and not serve via -b', () => {
      process.argv.push('-b')

      const appConfig = require('../roosevelt')({ ...config }).expressApp.get('params')

      assert.strictEqual(appConfig.makeBuildArtifacts, 'staticsOnly')
      assert.strictEqual(appConfig.buildOnly, true)
    })

    it('should not turn a static site into a build only run just because it is a static site', () => {
      // a static site says staticsOnly in its config for good, and still wants to be served when run without --build
      const appConfig = require('../roosevelt')({ ...config, makeBuildArtifacts: 'staticsOnly' }).expressApp.get('params')

      assert.strictEqual(appConfig.makeBuildArtifacts, 'staticsOnly')
      assert.strictEqual(appConfig.buildOnly, false)
    })

    it('should set production proxy mode via --production-proxy-mode', () => {
      // add the cli flag
      process.argv.push('--production-proxy-mode')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production-proxy')
    })

    it('should set production proxy mode via --prodproxy', () => {
      // add the cli flag
      process.argv.push('--prodproxy')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production-proxy')
    })

    it('should set production proxy mode via -x', () => {
      // add the cli flag
      process.argv.push('-x')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production-proxy')
    })

    it('should set production mode via --production-mode', () => {
      // add the cli flag
      process.argv.push('--production-mode')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production')
    })

    it('should set production mode via --prod', () => {
      // add the cli flag
      process.argv.push('--prod')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production')
    })

    it('should set production mode via -p', () => {
      // add the cli flag
      process.argv.push('-p')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production')
    })

    it('should set development mode via --development-mode', () => {
      // add the cli flag
      process.argv.push('--development-mode')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'development')
    })

    it('should set development mode via --dev', () => {
      // add the cli flag
      process.argv.push('--dev')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'development')
    })

    it('should set development mode via -d', () => {
      // add the cli flag
      process.argv.push('-d')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'development')
    })

    it('should enable html validator via --enable-validator', () => {
      // add the cli flag
      process.argv.push('--enable-validator')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: false
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, true)
    })

    it('should enable html validator via --html-validator', () => {
      // add the cli flag
      process.argv.push('--html-validator')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: false
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, true)
    })

    it('should enable html validator via -h', () => {
      // add the cli flag
      process.argv.push('-h')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: false
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, true)
    })

    it('should disable html validator via --disable-validator', () => {
      // add the cli flag
      process.argv.push('--disable-validator')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, false)
    })

    it('should disable html validator via --raw', () => {
      // add the cli flag
      process.argv.push('--raw')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, false)
    })

    it('should disable html validator via -r', () => {
      // add the cli flag
      process.argv.push('-r')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.enable, false)
    })

    it('should set js bundler verbose error handler to false when running in development mode without argument ', () => {
      // add the cli flag
      process.argv.push('--development')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, false)
    })

    it('should set js bundler verbose error handler to false when running --dev mode without argument ', () => {
      // add the cli flag
      process.argv.push('--dev')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, false)
    })

    it('should set js bundler verbose error handler to false when running -d mode without argument ', () => {
      // add the cli flag
      process.argv.push('-d')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, false)
    })

    it('should enable js bundler verbose error handler via -- --jsbundler=verbose', () => {
      // add the cli flag
      process.argv.push('--jsbundler=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.verbose, true)
    })

    it('should enable js bundler verbose error handler via -- --jsb=verbose', () => {
      // add the cli flag
      process.argv.push('--jsb=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.verbose, true)
    })

    it('should enable js bundler verbose error handler via -- -j=verbose', () => {
      // add the cli flag
      process.argv.push('-j=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.verbose, true)
    })

    it('should enable js bundler verbose error handler via -- --jsbundler=verbose-file', () => {
      // add the cli flag
      process.argv.push('--jsbundler=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, 'file')
    })

    it('should enable js bundler verbose error handler via -- --jsb=verbose-file', () => {
      // add the cli flag
      process.argv.push('--jsb=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, 'file')
    })

    it('should enable js bundler verbose error handler via -- -j=verbose-file', () => {
      // add the cli flag
      process.argv.push('-j=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.verbose, 'file')
    })
  })

  describe('environment variables', () => {
    const appConfig = {
      appDir: path.join(__dirname, '../app/envParams'),
      csrfProtection: false,
      logging: {
        methods: {
          http: false,
          info: false,
          warn: false
        }
      },
      https: {
        port: 12345
      }
    }
    let app

    it('should change the https.port param to 45678', function (t, done) {
      process.env.HTTPS_PORT = 45678

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').https.port, 45678)
      delete process.env.HTTPS_PORT
      done()
    })

    it('should ignore an env var that is present but empty and use the supplied param instead', function (t, done) {
      process.env.HTTPS_PORT = ''

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').https.port, 12345)
      delete process.env.HTTPS_PORT
      done()
    })

    it('should restore an env var that is present but empty after sourcing params', function (t, done) {
      process.env.HTTPS_PORT = ''

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(process.env.HTTPS_PORT, '')
      delete process.env.HTTPS_PORT
      done()
    })

    it('should ignore an empty NODE_ENV and use the supplied mode param instead', function (t, done) {
      process.env.NODE_ENV = ''

      app = require('../roosevelt')({ ...appConfig, mode: 'development' })
      assert.strictEqual(app.expressApp.get('params').mode, 'development')
      done()
    })

    it('should ignore an empty NODE_PORT and leave the supplied http.port param intact', function (t, done) {
      process.env.NODE_PORT = ''

      app = require('../roosevelt')({ ...appConfig, https: { enable: false }, http: { enable: true, port: 3000 } })
      assert.strictEqual(app.expressApp.get('params').http.port, 3000)
      delete process.env.NODE_PORT
      done()
    })
  })

  describe('special cases', () => {
    it('should default mode to production if it has an invalid value', () => {
      // initialize roosevelt with weird mode value
      const app = require('../roosevelt')({
        mode: 'weird',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.mode, 'production')
    })

    it('should prepend / to routePrefix param', () => {
      // initialize roosevelt with weird mode value
      const app = require('../roosevelt')({
        ...config,
        routePrefix: 'foo'
      })

      const prefix = app.expressApp.get('params').routePrefix

      assert.deepStrictEqual(prefix, '/foo')
    })

    it('should eliminate trailing / from routePrefix param', () => {
      // initialize roosevelt with weird mode value
      const app = require('../roosevelt')({
        ...config,
        routePrefix: 'foo/'
      })

      const prefix = app.expressApp.get('params').routePrefix

      assert.deepStrictEqual(prefix, '/foo')
    })

    it('should default routePrefix to empty string if set to nonstring value', () => {
      // initialize roosevelt with weird mode value
      const app = require('../roosevelt')({
        ...config,
        routePrefix: []
      })

      const prefix = app.expressApp.get('params').routePrefix

      assert.deepStrictEqual(prefix, '')
    })
  })

  describe('overriding command line args', () => {
    let processArgv

    // most of roosevelt's flags are switches, meaning supplying the flag implies a value rather than carrying one, so they are overridden a value at a time
    const schema = {
      rooseveltConfig: {
        mode: { // the name of the roosevelt param we're overriding
          commandLineArg: { // what we're changing the cli flags to
            development: ['--dev-mode-new']
          }
        }
      }
    }

    // a flag that carries its own value is overridden with a plain list instead
    const valueFlagSchema = {
      rooseveltConfig: {
        js: {
          verbose: {
            commandLineArg: ['--js-verbose']
          }
        }
      }
    }

    before(() => {
      // backup cli flags
      processArgv = process.argv.slice()
    })

    afterEach(() => {
      // restore cli flags
      process.argv = processArgv.slice()
    })

    it('should not set params based on default flags', (t, done) => {
      process.argv.push('--dev') // the original cli flag

      const app = require('../roosevelt')({
        ...config
      }, schema)

      assert.deepStrictEqual(app.expressApp.get('params').mode, 'production')
      done()
    })

    it('should set params based on specified flags', (t, done) => {
      process.argv.push('--dev-mode-new') // the new cli flag

      const app = require('../roosevelt')({
        ...config
      }, schema)

      assert.deepStrictEqual(app.expressApp.get('params').mode, 'development')
      done()
    })

    it('should leave the flags of values that were not overridden alone', (t, done) => {
      process.argv.push('--production-proxy-mode') // a flag of the same param that the schema did not touch

      const app = require('../roosevelt')({
        ...config
      }, schema)

      assert.deepStrictEqual(app.expressApp.get('params').mode, 'production-proxy')
      done()
    })

    it('should not set params based on the default flag of a flag that carries a value', (t, done) => {
      process.argv.push('--jsbundler') // the original cli flag
      process.argv.push('verbose')

      const app = require('../roosevelt')({
        ...config
      }, valueFlagSchema)

      assert.deepStrictEqual(app.expressApp.get('params').js.verbose, false)
      done()
    })

    it('should set params based on a specified flag that carries a value', (t, done) => {
      process.argv.push('--js-verbose') // the new cli flag
      process.argv.push('verbose')

      const app = require('../roosevelt')({
        ...config
      }, valueFlagSchema)

      assert.deepStrictEqual(app.expressApp.get('params').js.verbose, true)
      done()
    })

    it('should still honor the default flags when no schema is supplied', (t, done) => {
      process.argv.push('--dev')

      const app = require('../roosevelt')({
        ...config
      })

      assert.deepStrictEqual(app.expressApp.get('params').mode, 'development')
      done()
    })
  })

  describe('overriding environment variables', () => {
    const appConfig = {
      appDir: path.join(__dirname, '../app/envParams'),
      csrfProtection: false,
      logging: {
        methods: {
          http: false,
          info: false,
          warn: false
        }
      },
      http: {
        port: 12345
      }
    }

    const schema = {
      rooseveltConfig: {
        csrfProtection: false,
        http: {
          port: {
            envVar: ['HTTP_PORT_NEW']
          }
        }
      }
    }

    it('should not set param value from default env var', (t, done) => {
      process.env.HTTP_PORT = 45678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').http.port, 12345)
      delete process.env.HTTP_PORT
      done()
    })

    it('should get param value from specified env var', (t, done) => {
      process.env.HTTP_PORT_NEW = 45678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').http.port, 45678)
      delete process.env.HTTP_PORT_NEW
      done()
    })
  })
})
