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
    // blacklist certain params from auto checking
    const blacklist = [
      'appDir',
      'onServerInit',
      'onServerStart',
      'onReqStart',
      'onReqBeforeRoute',
      'onReqAfterRoute',
      'onClientViewsProcess',
      'cssCompiler',
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

        if (!blacklist.includes(key)) {
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

        if (!blacklist.includes(key)) {
          assert.deepStrictEqual(param, config[key], `${key} was not correctly set`)
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
          whitelist: [
            '${css.sourcePath}/hello.js' // eslint-disable-line
          ]
        },
        js: {
          sourcePath: 'coolJavaScript',
          webpack: {
            bundles: [
              {
                output: '${css.whitelist[0]}' // eslint-disable-line
              }
            ]
          }
        },
        staticsSymlinksToPublic: [
          '${js.sourcePath}' // eslint-disable-line
        ],
        versionedPublic: true,
        alwaysHostPublic: '${enableCLIFlags}' // eslint-disable-line
      }

      // initialize roosevelt
      const app = require('../roosevelt')(config)

      const appConfig = app.expressApp.get('params')

      // check against various scenarios
      assert.deepStrictEqual(appConfig.https.port, 4001, 'number param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.css.whitelist[0], path.join(appConfig.staticsRoot, 'coolCss/hello.js'), 'partial param variable not parsed correctly')
      assert.deepStrictEqual(appConfig.staticsSymlinksToPublic[0], path.join(appConfig.staticsRoot, 'coolJavaScript'), 'param variable within array not parsed correctly')
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

    it('should enable html validator separate process via --background-validator', () => {
      // add the cli flag
      process.argv.push('--background-validator')

      // set inverse environment variable
      process.env.ROOSEVELT_VALIDATOR = 'attached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, true)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should enable html validator separate process via -b', () => {
      // add the cli flag
      process.argv.push('-b')

      // set inverse environment variable
      process.env.ROOSEVELT_VALIDATOR = 'attached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, true)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should disable html validator separate process via --attach-validator', () => {
      // add the cli flag
      process.argv.push('--attach-validator')

      // set inverse environment variable
      process.env.ROOSEVELT_VALIDATOR = 'detached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, false)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should disable html validator separate process via -a', () => {
      // add the cli flag
      process.argv.push('-a')

      // set inverse environment variable
      process.env.ROOSEVELT_VALIDATOR = 'detached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, false)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should enable html validator autokiller via --enable-validator-autokiller', () => {
      // add the cli flag
      process.argv.push('--enable-validator-autokiller')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'off'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, true)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should enable html validator autokiller via --html-validator-autokiller', () => {
      // add the cli flag
      process.argv.push('--html-validator-autokiller')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'off'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, true)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should enable html validator autokiller via -k', () => {
      // add the cli flag
      process.argv.push('-k')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'off'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, true)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should disable html validator autokiller via --disable-validator-autokiller', () => {
      // add the cli flag
      process.argv.push('--disable-validator-autokiller')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'on'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, false)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should disable html validator autokiller via --no-autokiller', () => {
      // add the cli flag
      process.argv.push('--no-autokiller')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'on'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, false)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should disable html validator autokiller via -n', () => {
      // add the cli flag
      process.argv.push('-n')

      // set inverse environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'on'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, false)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })
  })

  describe('environment variables', () => {
    it('should enable html validator separate process when ROOOSEVELT_VALIDATOR === \'detached\'', () => {
      // set environment variable
      process.env.ROOSEVELT_VALIDATOR = 'detached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, true)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should disable html validator separate process when ROOOSEVELT_VALIDATOR === \'attached\'', () => {
      // set environment variable
      process.env.ROOSEVELT_VALIDATOR = 'attached'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.enable, false)

      // remove env var
      delete process.env.ROOSEVELT_VALIDATOR
    })

    it('should enable html validator autokiller when ROOOSEVELT_AUTOKILLER === \'on\'', () => {
      // set environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'on'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, true)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
    })

    it('should enable html validator autokiller when ROOOSEVELT_AUTOKILLER === \'off\'', () => {
      // set environment variable
      process.env.ROOSEVELT_AUTOKILLER = 'off'

      // initialize roosevelt with inverse configs
      const app = require('../roosevelt')({
        mode: 'development',
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true
          }
        },
        ...config
      })

      const appConfig = app.expressApp.get('params')

      assert.deepStrictEqual(appConfig.htmlValidator.separateProcess.autoKiller, false)

      // remove env var
      delete process.env.ROOSEVELT_AUTOKILLER
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
  })
})
