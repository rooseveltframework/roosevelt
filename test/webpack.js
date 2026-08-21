const { describe, it, beforeEach, afterEach } = require('node:test')
const rooseveltConfig = require('../config')
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('webpack', () => {
  const appDir = path.join(__dirname, 'app/webpack')
  const webpackConfig = [
    {
      env: 'production',
      config: {
        mode: 'production',
        entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')),
        output: {
          path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')),
          filename: 'prod.js'
        }
      }
    },
    {
      env: 'development',
      config: {
        entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')),
        output: {
          path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')),
          filename: 'dev.js'
        }
      }
    }
  ]

  const webpackConfigFile = `
    const path = require('path')

    module.exports = {
      mode: 'production',
      context: __dirname,
      entry: './statics/js/d.js',
      output: {
        path: path.join(__dirname, 'public/js'),
        filename: 'configBundle.js'
      }
    }`

  // sample js strings to bundle
  const fileA = `
    const x = 7
    const y = require('./b')
    const z = require('./c')
    x + y + z`
  const fileB = 'module.exports = 10'
  const fileC = 'module.exports = 8'
  const fileD = 'console.log(\'hello world\')'

  beforeEach(() => {
    // generate sample static js files
    fs.ensureDirSync(path.join(appDir, 'statics/js'))
    fs.writeFileSync(path.join(appDir, 'statics/js/a.js'), fileA)
    fs.writeFileSync(path.join(appDir, 'statics/js/b.js'), fileB)
    fs.writeFileSync(path.join(appDir, 'statics/js/c.js'), fileC)
    fs.writeFileSync(path.join(appDir, 'statics/js/d.js'), fileD)

    // generate sample webpack config file
    fs.writeFileSync(path.join(appDir, 'config.js'), webpackConfigFile)
  })

  afterEach(async () => {
    // wipe out the test app directory
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should build prod bundle using supplied webpack config', async () => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      expressSession: false,
      secretsPath: 'secrets',
      mode: 'production',
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: webpackConfig
      }
    })

    await app.initServer()

    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/prod.js')), true, 'webpack prod bundle was not created')
    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/dev.js')), false, 'webpack dev bundle was created for some reason')
  })

  // roosevelt used to force a minifier into the webpack config, which meant shipping a webpack plugin to every app whether it used webpack or not
  // webpack minifies on its own in production mode, so these check that dropping that did not quietly stop bundles from being minified
  it('should minify the bundle in production mode', async () => {
    fs.writeFileSync(path.join(appDir, 'statics/js/e.js'), 'function nameThatOnlySurvivesUnminified (argument) {\n  return argument + 1\n}\nconsole.log(nameThatOnlySurvivesUnminified(1))\n')

    await roosevelt({
      logging: { methods: { info: false, warn: false, error: false } },
      csrfProtection: false,
      expressSession: false,
      mode: 'production',
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: [{ config: { entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'e.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'minified.js' } } }]
      }
    }).initServer()

    const bundle = fs.readFileSync(path.join(appDir, 'public/js/minified.js'), 'utf8')

    assert.strictEqual(bundle.includes('nameThatOnlySurvivesUnminified'), false, 'the bundle still contains the original function name, so it was not minified')
    assert.strictEqual(fs.readdirSync(path.join(appDir, 'public/js')).join(), 'minified.js', 'only the bundle itself should be written, with no separate license file alongside it')
  })

  it('should not minify the bundle in development mode', async () => {
    fs.writeFileSync(path.join(appDir, 'statics/js/e.js'), 'function nameThatOnlySurvivesUnminified (argument) {\n  return argument + 1\n}\nconsole.log(nameThatOnlySurvivesUnminified(1))\n')

    await roosevelt({
      logging: { methods: { info: false, warn: false, error: false } },
      csrfProtection: false,
      expressSession: false,
      mode: 'development',
      htmlValidator: { enable: false },
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: [{ config: { entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'e.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'readable.js' } } }]
      }
    }).initServer()

    const bundle = fs.readFileSync(path.join(appDir, 'public/js/readable.js'), 'utf8')

    assert.ok(bundle.includes('nameThatOnlySurvivesUnminified'), 'development bundles should stay readable')
  })

  it('should build dev bundle using supplied webpack config', async () => {
    const app = roosevelt({
      mode: 'development',
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      expressSession: false,
      htmlValidator: {
        enable: false
      },
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: webpackConfig
      }
    })

    await app.initServer()

    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/dev.js')), true, 'webpack dev bundle was not created')
    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/prod.js')), false, 'webpack prod bundle was created for some reason')
  })

  it('should bundle in prod mode when env is not set', async () => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      expressSession: false,
      mode: 'production',
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: [
          {
            config: {
              mode: 'production',
              entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')),
              output: {
                path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')),
                filename: 'any.js'
              }
            }
          }
        ]
      }
    })

    await app.initServer()

    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
  })

  it('should bundle in dev mode when env is not set', async () => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      expressSession: false,
      mode: 'development',
      appDir,
      makeBuildArtifacts: true,
      htmlValidator: {
        enable: false
      },
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: [
          {
            config: {
              mode: 'production',
              entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')),
              output: {
                path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')),
                filename: 'any.js'
              }
            }
          }
        ]
      }
    })

    await app.initServer()

    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
  })

  it('should bundle from a mix of config objects and files', async () => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      expressSession: false,
      mode: 'development',
      appDir,
      makeBuildArtifacts: true,
      htmlValidator: {
        enable: false
      },
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles: [
          {
            config: 'config.js'
          },
          {
            config: {
              mode: 'production',
              entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')),
              output: {
                path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')),
                filename: 'any.js'
              }
            }
          }
        ]
      }
    })

    await app.initServer()

    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
    assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/configBundle.js')), true, 'webpack bundle was not created')
  })
})
