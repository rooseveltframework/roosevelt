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
      'onAppExit',
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
        appDir
      })

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      pkg.rooseveltConfig.staticsRoot = path.join(appDir, pkg.rooseveltConfig.staticsRoot)
      pkg.rooseveltConfig.publicFolder = (path.join(appDir, pkg.rooseveltConfig.publicFolder))
      pkg.rooseveltConfig.html.sourcePath = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.html.sourcePath)
      pkg.rooseveltConfig.html.output = path.join(pkg.rooseveltConfig.publicFolder, pkg.rooseveltConfig.html.output)
      pkg.rooseveltConfig.css.sourcePath = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.css.sourcePath)
      pkg.rooseveltConfig.css.output = path.join(pkg.rooseveltConfig.publicFolder, pkg.rooseveltConfig.css.output)
      pkg.rooseveltConfig.js.sourcePath = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.js.sourcePath)
      pkg.rooseveltConfig.clientViews.output = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.clientViews.output)
      pkg.rooseveltConfig.isomorphicControllers.output = path.join(pkg.rooseveltConfig.staticsRoot, pkg.rooseveltConfig.isomorphicControllers.output)

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
      config.html.sourcePath = path.join(config.staticsRoot, config.html.sourcePath)
      config.html.output = path.join(config.publicFolder, config.html.output)
      config.css.sourcePath = path.join(config.staticsRoot, config.css.sourcePath)
      config.css.output = path.join(config.publicFolder, config.css.output)
      config.js.sourcePath = path.join(config.staticsRoot, config.js.sourcePath)
      config.clientViews.output = path.join(config.staticsRoot, config.clientViews.output)
      config.isomorphicControllers.output = path.join(config.staticsRoot, config.isomorphicControllers.output)

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
        appDir
      })

      const appConfig = app.expressApp.get('params')

      // do some param post-processing that matches what we expect from roosevelt
      configJson.staticsRoot = path.join(appDir, configJson.staticsRoot)
      configJson.publicFolder = (path.join(appDir, configJson.publicFolder))
      configJson.html.sourcePath = path.join(configJson.staticsRoot, configJson.html.sourcePath)
      configJson.html.output = path.join(configJson.publicFolder, configJson.html.output)
      configJson.css.sourcePath = path.join(configJson.staticsRoot, configJson.css.sourcePath)
      configJson.css.output = path.join(configJson.publicFolder, configJson.css.output)
      configJson.js.sourcePath = path.join(configJson.staticsRoot, configJson.js.sourcePath)
      configJson.clientViews.output = path.join(configJson.staticsRoot, configJson.clientViews.output)
      configJson.isomorphicControllers.output = path.join(configJson.staticsRoot, configJson.isomorphicControllers.output)

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
        hostPublic: '${enableCLIFlags}' // eslint-disable-line
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
      assert.deepStrictEqual(appConfig.hostPublic, false, 'false param variable not parsed correctly')
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

    it('should set webpack verbose error handler to false when running in development mode withought webpack argument ', () => {
      // add the cli flag
      process.argv.push('--development')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, false)
    })

    it('should set webpack verbose error handler to false when running --dev mode withought webpack argument ', () => {
      // add the cli flag
      process.argv.push('--dev')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, false)
    })

    it('should set webpack verbose error handler to false when running -d mode withought webpack argument ', () => {
      // add the cli flag
      process.argv.push('-d')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'production',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, false)
    })

    it('should enable webpack verbose error handler via -- --webpack=verbose', () => {
      // add the cli flag
      process.argv.push('--webpack=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.webpack.verbose, true)
    })

    it('should enable webpack verbose error handler via -- --wp=verbose', () => {
      // add the cli flag
      process.argv.push('--wp=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.webpack.verbose, true)
    })

    it('should enable webpack verbose error handler via -- -w=verbose', () => {
      // add the cli flag
      process.argv.push('-w=verbose')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.js.webpack.verbose, true)
    })

    it('should enable webpack verbose error handler via -- --webpack=verbose-file', () => {
      // add the cli flag
      process.argv.push('--webpack=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, 'file')
    })

    it('should enable webpack verbose error handler via -- --wp=verbose-file', () => {
      // add the cli flag
      process.argv.push('--wp=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, 'file')
    })

    it('should enable webpack verbose error handler via -- -w=verbose-file', () => {
      // add the cli flag
      process.argv.push('-w=verbose-file')

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.js.webpack.verbose, 'file')
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

  describe('overriding command line args', () => {
    let processArgv

    const schema = {
      rooseveltConfig: {
        cores: {
          commandLineArg: ['--num-cores']
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

    it('should not set params based on default flags', (done) => {
      process.argv.push('--cores')
      process.argv.push(2)

      const app = require('../roosevelt')({
        ...config
      }, schema)

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.cores, 1)
      done()
    })

    it('should set params based on specified flags', (done) => {
      process.argv.push('--num-cores')
      process.argv.push(2)

      const app = require('../roosevelt')({
        ...config
      }, schema)

      const appConfig = app.expressApp.get('params')
      assert.deepStrictEqual(appConfig.cores, 2)
      done()
    })
  })

  describe('overriding environment variables', () => {
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
      port: 12345
    }

    const schema = {
      rooseveltConfig: {
        port: {
          envVar: ['HTTP_PORT_NEW']
        }
      }
    }

    it('should not set param value from default env var', function (done) {
      process.env.HTTP_PORT = 45678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').port, 12345)
      delete process.env.HTTP_PORT
      done()
    })

    it('should get param value from specified env var', function (done) {
      process.env.HTTP_PORT_NEW = 45678

      const app = require('../roosevelt')(appConfig, schema)
      assert.strictEqual(app.expressApp.get('params').port, 45678)
      delete process.env.HTTP_PORT_NEW
      done()
    })
  })
})
