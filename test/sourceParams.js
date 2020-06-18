/* eslint-env mocha */

const appCleaner = require('./util/appCleaner')
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
  }
}

describe('sourceParams', () => {
  describe('config objects', () => {
    // blocklist certain params from auto checking
    const blocklist = [
      'appDir',
      'cssCompiler',
      'onClientViewsProcess',
      'onReqAfterRoute',
      'onReqBeforeRoute',
      'onReqStart',
      'onServerInit',
      'onServerStart',
      'routePrefix',
      'unversionedPublic'
    ]

    afterEach(done => {
      (async () => {
        // wipe out the test app directory
        await appCleaner('sourceParams')

        done()
      })()
    })

    it('should set params from package.json', () => {
      // set app directory
      const appDir = path.join(__dirname, 'app/sourceParams')

      // build roosevelt config from sample
      const pkg = {
        rooseveltConfig: {
          ...sampleConfig,
          enableCLIFlags: false
        }
      }

      // create app directory
      fs.ensureDirSync(path.join(appDir))

      // generate package.json with sample config
      fs.writeJSONSync(path.join(appDir, 'package.json'), pkg)

      // initialize roosevelt
      const app = require('../roosevelt')({
        appDir: appDir
      })

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      pkg.rooseveltConfig.staticsRoot = path.join(appDir, pkg.rooseveltConfig.staticsRoot)
      pkg.rooseveltConfig.publicFolder = (path.join(appDir, pkg.rooseveltConfig.publicFolder))
      pkg.rooseveltConfig.css.sourcePath = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.css.sourcePath)
      pkg.rooseveltConfig.css.output = path.join(pkg.rooseveltConfig.publicFolder, pkg.rooseveltConfig.css.output)
      pkg.rooseveltConfig.js.sourcePath = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.js.sourcePath)
      pkg.rooseveltConfig.clientViews.output = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.clientViews.output)

      // for each param, test that its value is set in roosevelt
      for (const key in appConfig) {
        const param = appConfig[key]

        if (!blocklist.includes(key)) {
          assert.deepStrictEqual(param, pkg.rooseveltConfig[key], `${key} was not correctly set`)
        }
      }
    })

    it('should set params from constructor', () => {
      // build roosevelt config from sample
      const config = {
        ...sampleConfig,
        appDir: 'value',
        enableCLIFlags: false
      }

      // initialize roosevelt
      const app = require('../roosevelt')(config)

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      config.staticsRoot = path.join(config.appDir, config.staticsRoot)
      config.publicFolder = (path.join(config.appDir, config.publicFolder))
      config.css.sourcePath = path.join(config.staticsRoot, config.css.sourcePath)
      config.css.output = path.join(config.publicFolder, config.css.output)
      config.js.sourcePath = path.join(config.staticsRoot, config.js.sourcePath)
      config.clientViews.output = path.join(config.staticsRoot, config.clientViews.output)

      // for each param, test that its value is set in roosevelt
      for (const key in appConfig) {
        const param = appConfig[key]

        if (!blocklist.includes(key)) {
          assert.deepStrictEqual(param, config[key], `${key} was not correctly set`)
        }
      }
    })

    it('should set params from rooseveltConfig.json', () => {
      // set app directory
      const appDir = path.join(__dirname, 'app/sourceParams')

      // build roosevelt config from sample
      const configJson = {
        ...sampleConfig,
        enableCLIFlags: false
      }

      // create app directory
      fs.ensureDirSync(path.join(appDir))

      // generate rooseveltConfig.json with sample config
      fs.writeJSONSync(path.join(appDir, 'rooseveltConfig.json'), configJson)

      // initialize roosevelt
      const app = require('../roosevelt')({
        appDir: appDir
      })

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      configJson.staticsRoot = path.join(appDir, configJson.staticsRoot)
      configJson.publicFolder = (path.join(appDir, configJson.publicFolder))
      configJson.css.sourcePath = path.join(configJson.staticsRoot, configJson.css.sourcePath)
      configJson.css.output = path.join(configJson.publicFolder, configJson.css.output)
      configJson.js.sourcePath = path.join(configJson.staticsRoot, configJson.js.sourcePath)
      configJson.clientViews.output = path.join(configJson.staticsRoot, configJson.clientViews.output)

      // for each param, test that its value is set in roosevelt
      for (const key in appConfig) {
        const param = appConfig[key]

        if (!blocklist.includes(key)) {
          assert.deepStrictEqual(param, configJson[key], `${key} was not correctly set`)
        }
      }
    })

    it('should resolve variables in params', () => {
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
        enableCLIFlags: false,
        port: 4000,
        https: {
          port: '${(port + 1)}' // eslint-disable-line
        },
        formidable: {
          multiples: '${versionedPublic}' // eslint-disable-line
        },
        css: {
          sourcePath: 'coolCss',
          allowlist: [
            '${css.sourcePath}/hello.js' // eslint-disable-line
          ]
        },
        js: {
          sourcePath: 'coolJavaScript',
          webpack: {
            bundles: [
              {
                output: '${css.allowlist[0]}' // eslint-disable-line
              }
            ]
          }
        },
        symlinks: [
          {
            source: '${js.sourcePath}', // eslint-disable-line
            dest: '${publicFolder}/js', // eslint-disable-line
          }
        ],
        versionedPublic: true,
        alwaysHostPublic: '${enableCLIFlags}' // eslint-disable-line
      }

      // initialize roosevelt
      const app = require('../roosevelt')(config)

      const appConfig = app.expressApp.get('params')

      // check against various scenarios
      assert.deepStrictEqual(appConfig.https.port, 4001, 'number param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.css.allowlist[0], path.join(appConfig.staticsRoot, 'coolCss/hello.js'), 'partial param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.symlinks[0].source, path.join(appConfig.staticsRoot, 'coolJavaScript'), 'param variable within array not parsed correctly')
      assert.deepStrictEqual(appConfig.symlinks[0].dest, path.join(appConfig.publicFolder, 'js'), 'param variable within array not parsed correctly')
      assert.deepStrictEqual(appConfig.js.webpack.bundles[0].output, path.join(appConfig.staticsRoot, 'coolCss/hello.js'), 'deeply nested param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.formidable.multiples, true, 'true param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.alwaysHostPublic, false, 'false param variable not parsed correctly')
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

    it('should enable alwaysHostPublic via --host-public', () => {
      // add the cli flag
      process.argv.push('--host-public')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        alwaysHostPublic: false,
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.alwaysHostPublic, true)
    })

    it('should enable alwaysHostPublic via --statics', () => {
      // add the cli flag
      process.argv.push('--statics')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        alwaysHostPublic: false,
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.alwaysHostPublic, true)
    })

    it('should enable alwaysHostPublic via -s', () => {
      // add the cli flag
      process.argv.push('--statics')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        alwaysHostPublic: false,
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.alwaysHostPublic, true)
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
  })

  describe('environment variables', () => {
    const appConfig = {
      appDir: path.join(__dirname, '../app/envParams'),
      enableCLIFlags: false,
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

    it('should disable validator if HTTP_PROXY is set and NO_PROXY does not contain localhost', function (done) {
      process.env.HTTP_PROXY = true
      process.env.NO_PROXY = 'hsdfhjsdf hdsfjhsdf dhf sdhjfhsd fhjsdf dshjfhs'
      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').htmlValidator.enable, false)
      delete process.env.HTTP_PROXY
      delete process.env.NO_PROXY
      done()
    })

    it('should disable validator if HTTPS_PROXY is set and NO_PROXY does not contain localhost', function (done) {
      process.env.HTTPS_PROXY = true
      process.env.NO_PROXY = 'blah'
      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').htmlValidator.enable, false)
      delete process.env.HTTPS_PROXY
      delete process.env.NO_PROXY
      done()
    })

    it('should change the https.port param to 45678', function (done) {
      process.env.HTTPS_PORT = 45678

      app = require('../roosevelt')(appConfig)
      assert.strictEqual(app.expressApp.get('params').https.port, 45678)
      delete process.env.HTTPS_PORT
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
})
