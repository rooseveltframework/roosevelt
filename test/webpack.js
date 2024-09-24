/* eslint-env mocha */
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const appCleaner = require('./util/appCleaner')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe.skip('webpack', () => {
  const appDir = path.join(__dirname, 'app/webpack')
  const webpackConfig = [
    {
      env: 'prod',
      config: {
        mode: 'production',
        entry: '${js.sourcePath}/a.js',
        output: {
          path: '${publicFolder}/js',
          filename: 'prod.js'
        }
      }
    },
    {
      env: 'dev',
      config: {
        entry: '${js.sourcePath}/a.js',
        output: {
          path: '${publicFolder}/js',
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

  afterEach(done => {
    (async () => {
      // wipe out the test app directory
      await appCleaner('webpack')

      done()
    })()
  })

  it('should build prod bundle using supplied webpack config', done => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      secretsDir: 'secrets',
      mode: 'production',
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourceDir: 'js',
        webpack: {
          enable: true,
          bundles: webpackConfig
        }
      }
    })

    app.initServer(() => {
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/prod.js')), true, 'webpack prod bundle was not created')
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/dev.js')), false, 'webpack dev bundle was created for some reason')
      done()
    })
  })

  it('should build dev bundle using supplied webpack config', done => {
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
      htmlValidator: {
        enable: false
      },
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourceDir: 'js',
        webpack: {
          enable: true,
          bundles: webpackConfig
        }
      }
    })

    app.initServer(() => {
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/dev.js')), true, 'webpack dev bundle was not created')
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/prod.js')), false, 'webpack prod bundle was created for some reason')
      done()
    })
  })

  it('should bundle in prod mode when env is not set', done => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      mode: 'production',
      appDir,
      makeBuildArtifacts: true,
      js: {
        sourceDir: 'js',
        webpack: {
          enable: true,
          bundles: [
            {
              config: {
                mode: 'production',
                entry: '${js.sourcePath}/a.js',
                output: {
                  path: '${publicFolder}/js',
                  filename: 'any.js'
                }
              }
            }
          ]
        }
      }
    })

    app.initServer(() => {
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
      done()
    })
  })

  it('should bundle in dev mode when env is not set', done => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      mode: 'development',
      appDir,
      makeBuildArtifacts: true,
      htmlValidator: {
        enable: false
      },
      js: {
        sourceDir: 'js',
        webpack: {
          enable: true,
          bundles: [
            {
              config: {
                mode: 'production',
                entry: '${js.sourcePath}/a.js',
                output: {
                  path: '${publicFolder}/js',
                  filename: 'any.js'
                }
              }
            }
          ]
        }
      }
    })

    app.initServer(() => {
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
      done()
    })
  })

  it('should bundle from a mix of config objects and files', done => {
    const app = roosevelt({
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false
        }
      },
      csrfProtection: false,
      mode: 'development',
      appDir,
      makeBuildArtifacts: true,
      htmlValidator: {
        enable: false
      },
      js: {
        sourceDir: 'js',
        webpack: {
          enable: true,
          bundles: [
            {
              config: 'config.js'
            },
            {
              config: {
                mode: 'production',
                entry: '${js.sourcePath}/a.js',
                output: {
                  path: '${publicFolder}/js',
                  filename: 'any.js'
                }
              }
            }
          ]
        }
      }
    })

    app.initServer(() => {
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/any.js')), true, 'webpack bundle was not created')
      assert.deepStrictEqual(fs.pathExistsSync(path.join(appDir, 'public/js/configBundle.js')), true, 'webpack bundle was not created')
      done()
    })
  })
})
