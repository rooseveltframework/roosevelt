/* eslint-env mocha */

const appCleaner = require('./util/appCleaner')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const sampleConfig = require('./util/sampleConfig.json')

describe('sourceParams', () => {
  // blacklist param functions and internal params
  const blacklist = [
    'onServerInit',
    'onServerStart',
    'onReqStart',
    'onReqBeforeRoute',
    'onReqAfterRoute',
    'onClientViewsProcess',
    'jsCompiler',
    'cssCompiler',
    'staticsPrefix'
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
      multipart: {
        multiples: '${versionedPublic}' // eslint-disable-line
      },
      js: {
        sourcePath: 'coolJavaScript',
        whitelist: [
          '${js.sourcePath}/hello.js' // eslint-disable-line
        ],
        bundler: {
          bundles: [
            {
              outputFile: '${js.whitelist[0]}' // eslint-disable-line
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
    assert.deepStrictEqual(appConfig.js.whitelist[0], 'coolJavaScript/hello.js', 'partial param variable not parsed correctly')
    assert.deepStrictEqual(appConfig.staticsSymlinksToPublic[0], 'coolJavaScript', 'param variable within array not parsed correctly')
    assert.deepStrictEqual(appConfig.js.bundler.bundles[0].outputFile, 'coolJavaScript/hello.js', 'deeply nested param variable not parsed correctly')
    assert.deepStrictEqual(appConfig.multipart.multiples, true, 'true param variable not parsed correctly')
    assert.deepStrictEqual(appConfig.alwaysHostPublic, false, 'false param variable not parsed correctly')
  })
})
