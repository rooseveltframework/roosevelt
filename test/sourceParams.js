const { describe, it, before, after, afterEach } = require('node:test')
const rooseveltConfig = require('../config')
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const sampleConfig = require('./util/sampleConfig.json')

// every app here is given a directory of its own under test/app, since an app given none defaults to the directory of whatever first required roosevelt, which is test/ itself
const appDir = path.join(__dirname, 'app/sourceParams')

const config = {
  appDir,
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

// the sample config predates the https.caPath param and the rename of htmlValidator.exceptions.requestHeader to header, so the expected values are brought up to date here
//
// requestHeader is left in the sample on purpose, which also covers an old config still being honored under the new name
function expectedFromSample () {
  const expected = structuredClone(sampleConfig)
  expected.https.caPath = null
  expected.logging.methods.error = true // the sample leaves this one out, and roosevelt fills in the default of anything an object param leaves out
  const { requestHeader, ...exceptions } = expected.htmlValidator.exceptions
  expected.htmlValidator.exceptions = { header: requestHeader, ...exceptions }
  return expected
}

describe('sourceParams', () => {
  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

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
      //
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
        ...expectedFromSample(),
        appDir
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
      config.clientModels.output = path.join(config.buildFolder, config.clientModels.output)

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
      //
      // a folder of its own, since the config stays in the module cache after the folder is deleted, and the other tests here would otherwise find it there
      const appDir = path.join(__dirname, 'app/sourceParams/fromConfigFile')

      // build roosevelt config from sample
      const configJson = {
        ...expectedFromSample()
      }

      // create app directory
      fs.ensureDirSync(path.join(appDir))

      // generate rooseveltConfig.js with sample config
      fs.outputFileSync(path.join(appDir, 'rooseveltConfig.js'), 'module.exports = ' + JSON.stringify(sampleConfig))

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
      configJson.clientModels.output = path.join(configJson.buildFolder, configJson.clientModels.output)

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
        appDir,
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
      //
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

    it('should leave a js bundler verbose setting from the config alone when switching to development mode via --development-mode', () => {
      // a mode flag only changes the mode, so a verbose bundler the app asked for in its config has to survive it
      process.argv.push('--development-mode')

      const app = require('../roosevelt')({
        mode: 'production',
        ...config,
        js: { verbose: true }
      })

      const appConfig = app.expressApp.get('params')

      assert.strictEqual(appConfig.mode, 'development', 'the flag should still have changed the mode')
      assert.strictEqual(appConfig.js.verbose, true)
    })

    it('should leave a js bundler verbose setting from the config alone when switching to development mode via --dev', () => {
      // a mode flag only changes the mode, so a verbose bundler the app asked for in its config has to survive it
      process.argv.push('--dev')

      const app = require('../roosevelt')({
        mode: 'production',
        ...config,
        js: { verbose: true }
      })

      const appConfig = app.expressApp.get('params')

      assert.strictEqual(appConfig.mode, 'development', 'the flag should still have changed the mode')
      assert.strictEqual(appConfig.js.verbose, true)
    })

    it('should leave a js bundler verbose setting from the config alone when switching to development mode via -d', () => {
      // a mode flag only changes the mode, so a verbose bundler the app asked for in its config has to survive it
      process.argv.push('-d')

      const app = require('../roosevelt')({
        mode: 'production',
        ...config,
        js: { verbose: true }
      })

      const appConfig = app.expressApp.get('params')

      assert.strictEqual(appConfig.mode, 'development', 'the flag should still have changed the mode')
      assert.strictEqual(appConfig.js.verbose, true)
    })

    it('should leave js bundler verbose off when --jsbundler is given no value', () => {
      // only verbose and verbose-file mean anything, so the bare flag should not switch it on by accident
      process.argv.push('--jsbundler')

      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      assert.strictEqual(app.expressApp.get('params').js.verbose, false)
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
      appDir,
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

    // every env var these tests set is put back the way it was, so a test that fails partway through cannot hand its environment to the next one
    const envVars = ['PORT', 'NODE_PORT', 'HTTP_PORT', 'HTTPS_PORT', 'DISABLE_HTTPS', 'SWAP_HTTPS_TO_HTTP', 'QUIETER_STARTUP']
    let savedEnv
    let processArgv

    before(() => {
      savedEnv = Object.fromEntries(envVars.map(name => [name, process.env[name]]))
      processArgv = process.argv.slice()
    })

    afterEach(() => {
      for (const name of envVars) {
        if (savedEnv[name] === undefined) delete process.env[name]
        else process.env[name] = savedEnv[name]
      }
      process.argv = processArgv.slice()
    })

    it('should take the http port from PORT, which is what hosts and local proxies set', () => {
      process.env.PORT = 20679
      const app = require('../roosevelt')({ ...config, https: { enable: false } })

      assert.strictEqual(Number(app.expressApp.get('params').http.port), 20679)
    })

    it('should let NODE_PORT outrank PORT, since PORT is a name that may belong to something else', () => {
      process.env.NODE_PORT = 20680
      process.env.PORT = 20679
      const app = require('../roosevelt')({ ...config, https: { enable: false } })

      assert.strictEqual(Number(app.expressApp.get('params').http.port), 20680)
    })

    it('should let HTTP_PORT outrank both of them', () => {
      process.env.HTTP_PORT = 20681
      process.env.NODE_PORT = 20680
      process.env.PORT = 20679
      const app = require('../roosevelt')({ ...config, https: { enable: false } })

      assert.strictEqual(Number(app.expressApp.get('params').http.port), 20681)
    })

    it('should give PORT to https alone when both servers are on, rather than starting both on it', () => {
      // PORT used to be read for both ports, so an app with both servers on tried to listen twice on the same port and failed to start
      process.env.PORT = 20682
      const params = require('../roosevelt')({ ...config, http: { enable: true, port: 20683 }, https: { enable: true, port: 20684 } }).expressApp.get('params')

      assert.strictEqual(Number(params.https.port), 20682, 'https should take PORT')
      assert.strictEqual(Number(params.http.port), 20683, 'http should keep its own port')
    })

    it('should give NODE_PORT to http when SWAP_HTTPS_TO_HTTP switches https off', () => {
      // the swap decides which server the generic port belongs to, so it has to be honored before the port is handed out
      process.env.SWAP_HTTPS_TO_HTTP = 'true'
      process.env.NODE_PORT = 20685
      const params = require('../roosevelt')({ ...config, http: { enable: false, port: 20686 }, https: { enable: true, port: 20687 } }).expressApp.get('params')

      assert.strictEqual(params.https.enable, false)
      assert.strictEqual(params.http.enable, true)
      assert.strictEqual(Number(params.http.port), 20685)
    })

    it('should give PORT to http when DISABLE_HTTPS switches https off', () => {
      process.env.DISABLE_HTTPS = 'true'
      process.env.PORT = 20688
      const params = require('../roosevelt')({ ...config, http: { enable: true, port: 20689 }, https: { enable: true, port: 20690 } }).expressApp.get('params')

      assert.strictEqual(params.https.enable, false)
      assert.strictEqual(Number(params.http.port), 20688)
    })

    it('should change the https.port param to 20678', () => {
      process.env.HTTPS_PORT = 20678

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').https.port, 20678)
    })

    it('should ignore an env var that is present but empty and use the supplied param instead', () => {
      process.env.HTTPS_PORT = ''

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').https.port, 12345)
    })

    it('should restore an env var that is present but empty after sourcing params', () => {
      process.env.HTTPS_PORT = ''

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(process.env.HTTPS_PORT, '')
    })

    it('should take quieterStartup from QUIETER_STARTUP', () => {
      process.env.QUIETER_STARTUP = 'true'

      assert.strictEqual(require('../roosevelt')({ ...config }).expressApp.get('params').logging.quieterStartup, true)
    })

    it('should let the --quieter-startup flag outrank QUIETER_STARTUP, as a flag outranks an env var everywhere else', () => {
      process.env.QUIETER_STARTUP = 'false'
      process.argv.push('--quieter-startup')

      assert.strictEqual(require('../roosevelt')({ ...config }).expressApp.get('params').logging.quieterStartup, true)
    })

    it('should let the -q flag outrank QUIETER_STARTUP too', () => {
      process.env.QUIETER_STARTUP = 'false'
      process.argv.push('-q')

      assert.strictEqual(require('../roosevelt')({ ...config }).expressApp.get('params').logging.quieterStartup, true)
    })

    it('should prefer the mode the app gave the constructor over NODE_ENV, which is inherited from wherever the app runs', () => {
      process.env.NODE_ENV = 'production'
      app = require('../roosevelt')({ ...appConfig, mode: 'development' })
      assert.strictEqual(app.expressApp.get('params').mode, 'development')
    })

    it('should take the mode from NODE_ENV when the app gives the constructor none', () => {
      process.env.NODE_ENV = 'development'
      app = require('../roosevelt')({ ...appConfig })
      assert.strictEqual(app.expressApp.get('params').mode, 'development')
    })

    it('should prefer NODE_ENV over a mode in the config file', () => {
      const appDir = path.join(__dirname, 'app/nodeEnvOverConfigFile')
      fs.outputFileSync(path.join(appDir, 'roosevelt.config.js'), 'module.exports = { mode: \'production\' }')
      process.env.NODE_ENV = 'development'
      try {
        app = require('../roosevelt')({ ...appConfig, appDir })
        assert.strictEqual(app.expressApp.get('params').mode, 'development')
      } finally {
        fs.rmSync(appDir, { recursive: true, force: true })
      }
    })

    it('should give each app the mode it was given, rather than one another app set NODE_ENV to earlier in the same process', () => {
      require('../roosevelt')({ ...appConfig, mode: 'production' }) // which sets NODE_ENV to production
      assert.strictEqual(process.env.NODE_ENV, 'production')
      app = require('../roosevelt')({ ...appConfig, mode: 'development' })
      assert.strictEqual(app.expressApp.get('params').mode, 'development')
    })

    it('should ignore an empty NODE_ENV and use the supplied mode param instead', () => {
      process.env.NODE_ENV = ''

      app = require('../roosevelt')({ ...appConfig, mode: 'development' })
      assert.strictEqual(app.expressApp.get('params').mode, 'development')
    })

    it('should ignore an empty NODE_PORT and leave the supplied http.port param intact', () => {
      process.env.NODE_PORT = ''

      app = require('../roosevelt')({ ...appConfig, https: { enable: false }, http: { enable: true, port: 3000 } })
      assert.strictEqual(app.expressApp.get('params').http.port, 3000)
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

  describe('where params are read from', () => {
    // each test gets a folder of its own, because a config file is loaded with require and would otherwise come back out of the module cache
    let run = 0
    function freshDir () {
      const dir = path.join(appDir, 'readFrom', String(++run))
      fs.ensureDirSync(dir)
      return dir
    }

    // console.error is what reports a config file that fails to load, and it is collected here rather than left to land on stderr, where the suite would rightly call it unexpected
    function collectConsoleErrors (fn) {
      const realError = console.error
      const errors = []
      console.error = (...args) => errors.push(args.map(arg => arg instanceof Error ? arg.message : String(arg)).join(' '))
      try {
        return { result: fn(), errors }
      } finally {
        console.error = realError
      }
    }

    it('should show the error from a config file that requires a package that is not installed', () => {
      // node names the config itself in the message as the file that asked for the missing package, which is how this used to be mistaken for the config simply being absent
      const dir = freshDir()
      fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'require(\'a-package-nobody-installed\')\nmodule.exports = {}\n')

      const { errors } = collectConsoleErrors(() => require('../roosevelt')({ ...config, appDir: dir }))

      assert.ok(errors.some(error => error.includes('a-package-nobody-installed')), `expected the missing package to be reported, got: ${JSON.stringify(errors)}`)
    })

    it('should say nothing when there is no config file at all', () => {
      const dir = freshDir()

      const { errors } = collectConsoleErrors(() => require('../roosevelt')({ ...config, appDir: dir }))

      assert.deepStrictEqual(errors, [])
    })

    it('should read the package.json and config file of an app given a relative appDir', () => {
      // a relative path made require look for a package named after it in node_modules, which failed quietly and left the app running on defaults
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'relativeAppDir', version: '1.2.3' })
      fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'module.exports = { http: { port: 20691 } }')

      const params = require('../roosevelt')({ ...config, appDir: path.relative(process.cwd(), dir) }).expressApp.get('params')

      assert.strictEqual(params.pkg.name, 'relativeAppDir', 'package.json should have been read')
      assert.strictEqual(params.http.port, 20691, 'the config file should have been read')
      assert.strictEqual(params.appDir, dir, 'and the app directory should be handed on resolved')
      assert.strictEqual(params.secretsPath, path.join(dir, 'secrets'), 'so that the paths built from it are absolute too')
    })

    describe('the html validator\'s header exception', () => {
      it('should be called header, which is the name the validator reads', () => {
        const exceptions = require('../roosevelt')({ ...config }).expressApp.get('params').htmlValidator.exceptions

        assert.strictEqual(exceptions.header, 'Partial')
        assert.strictEqual('requestHeader' in exceptions, false)
      })

      it('should still honor the old requestHeader name', () => {
        const exceptions = require('../roosevelt')({ ...config, htmlValidator: { exceptions: { requestHeader: 'X-Old-Name' } } }).expressApp.get('params').htmlValidator.exceptions

        assert.strictEqual(exceptions.header, 'X-Old-Name')
      })

      it('should honor the old name from the config file too', () => {
        const dir = freshDir()
        fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'module.exports = { htmlValidator: { exceptions: { requestHeader: \'X-From-Config\' } } }')

        const exceptions = require('../roosevelt')({ ...config, appDir: dir }).expressApp.get('params').htmlValidator.exceptions

        assert.strictEqual(exceptions.header, 'X-From-Config')
      })

      it('should let header win when both names are set', () => {
        const exceptions = require('../roosevelt')({ ...config, htmlValidator: { exceptions: { header: 'X-New-Name', requestHeader: 'X-Old-Name' } } }).expressApp.get('params').htmlValidator.exceptions

        assert.strictEqual(exceptions.header, 'X-New-Name')
      })
    })

    describe('https.caPath', () => {
      it('should default to null, which keeps the authority in secretsPath', () => {
        assert.strictEqual(require('../roosevelt')({ ...config }).expressApp.get('params').https.caPath, null)
      })

      it('should resolve a relative path against the app directory', () => {
        assert.strictEqual(require('../roosevelt')({ ...config, https: { caPath: 'sharedCA' } }).expressApp.get('params').https.caPath, path.join(appDir, 'sharedCA'))
      })

      it('should leave an absolute path where it points, so an authority can be shared between apps', () => {
        const shared = path.join(__dirname, 'app/sourceParams/elsewhere/ca')

        assert.strictEqual(require('../roosevelt')({ ...config, https: { caPath: shared } }).expressApp.get('params').https.caPath, shared)
      })
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
      appDir,
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

    // put back as they were, so a test that fails partway through cannot hand its environment to the next one
    const envVars = ['HTTP_PORT', 'HTTP_PORT_NEW']
    let savedEnv

    before(() => {
      savedEnv = Object.fromEntries(envVars.map(name => [name, process.env[name]]))
    })

    afterEach(() => {
      for (const name of envVars) {
        if (savedEnv[name] === undefined) delete process.env[name]
        else process.env[name] = savedEnv[name]
      }
    })

    it('should not set param value from default env var', () => {
      process.env.HTTP_PORT = 20678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').http.port, 12345)
    })

    it('should get param value from specified env var', () => {
      process.env.HTTP_PORT_NEW = 20678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').http.port, 20678)
    })
  })
})
