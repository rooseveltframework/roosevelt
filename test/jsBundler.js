const { describe, it, after, beforeEach } = require('node:test')
const rooseveltConfig = require('../config')
const captureLogs = require('./util/captureLogs')
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('js bundler', () => {
  const appDir = path.join(__dirname, 'app/jsBundler')

  const appConfig = {
    appDir,
    mode: 'production',
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
    fs.ensureDirSync(path.join(appDir, 'statics/js'))
    fs.writeFileSync(path.join(appDir, 'statics/js/a.js'), 'module.exports = 1\n')
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('custom bundler', () => {
    it('should run the custom bundler function', async () => {
      let called = false

      await roosevelt({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [{ config: {} }],
          customBundlerFunction: () => { called = true }
        }
      }).initServer()

      assert.strictEqual(called, true)
    })

    it('should pass the bundle, config, and app to the custom bundler function', async () => {
      let received = null

      await roosevelt({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [{ config: { marker: 'my config' } }],
          customBundlerFunction: (bundle, config, app) => {
            received = { bundle: !!bundle, marker: config.marker, appName: app.get('appName') }
          }
        }
      }).initServer()

      assert.strictEqual(received.bundle, true)
      assert.strictEqual(received.marker, 'my config')
      assert.ok(received.appName, 'the roosevelt app should have been passed through')
    })

    it('should read a custom bundler config supplied as a file path', async () => {
      fs.writeFileSync(path.join(appDir, 'customConfig.js'), 'module.exports = { marker: "from a file" }')
      let marker = null

      await roosevelt({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [{ config: 'customConfig.js' }],
          customBundlerFunction: (bundle, config) => { marker = config.marker }
        }
      }).initServer()

      assert.strictEqual(marker, 'from a file')
    })

    it('should only run bundles matching the current mode', async () => {
      const ran = []

      await roosevelt({
        ...appConfig,
        mode: 'production',
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [
            { env: 'production', config: { name: 'prod' } },
            { env: 'development', config: { name: 'dev' } },
            { config: { name: 'both' } }
          ],
          customBundlerFunction: (bundle, config) => { ran.push(config.name) }
        }
      }).initServer()

      assert.deepStrictEqual(ran, ['prod', 'both'])
    })

    // a custom bundler used to be excluded from incremental builds because it never said which files it read
    it('should skip a rebuild when the custom bundler reports what it read and nothing changed', async () => {
      const source = path.join(appDir, 'statics/js/a.js')
      const output = path.join(appDir, 'public/js/custom.js')
      let runs = 0

      const config = () => ({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [{ config: {} }],
          customBundlerFunction: () => {
            runs++
            fs.outputFileSync(output, 'bundled\n')
            return { outputs: [output], sources: [source] }
          }
        }
      })

      await roosevelt(config()).initServer()
      assert.strictEqual(runs, 1, 'the first start should build')

      await roosevelt(config()).initServer()
      assert.strictEqual(runs, 1, 'nothing changed, so the second start should not build again')

      fs.writeFileSync(source, 'module.exports = 2\n')
      await roosevelt(config()).initServer()
      assert.strictEqual(runs, 2, 'the source changed, so it should build again')
    })

    it('should keep building every time when the custom bundler reports nothing', async () => {
      let runs = 0

      const config = () => ({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: true },
          bundles: [{ config: {} }],
          customBundlerFunction: () => { runs++ }
        }
      })

      await roosevelt(config()).initServer()
      await roosevelt(config()).initServer()

      assert.strictEqual(runs, 2, 'a bundler that says nothing about its files cannot be skipped')
    })

    it('should not run when bundling is disabled', async () => {
      let called = false

      await roosevelt({
        ...appConfig,
        js: {
          sourcePath: 'js',
          bundler: { enable: false },
          bundles: [{ config: {} }],
          customBundlerFunction: () => { called = true }
        }
      }).initServer()

      assert.strictEqual(called, false)
    })
  })

  describe('choosing a bundler', () => {
    it('should log an error when the named bundler is not one roosevelt supports', async () => {
      const captured = await captureInit({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        js: {
          sourcePath: 'js',
          bundler: { enable: true, module: 'someBundlerThatDoesNotExist' },
          bundles: [{ config: {} }]
        }
      })

      assert.ok(captured.includes('does not have built in support'), `expected an unsupported bundler error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should log an error when the named bundler is supported but not installed', async () => {
      // roosevelt does not ship bundlers, so this is what an app that names one without installing it should see
      //
      // rollup has to be hidden rather than simply left out, because it really is installed here as a dev dependency these tests use
      const Module = require('module')
      const realLoad = Module._load
      Module._load = function (request, ...rest) {
        if (request === 'rollup') throw Object.assign(new Error("Cannot find module 'rollup'"), { code: 'MODULE_NOT_FOUND' })
        return realLoad.call(this, request, ...rest)
      }

      let captured = ''
      try {
        const app = roosevelt({
          ...appConfig,
          logging: { methods: { http: false, info: false, verbose: false } },
          js: {
            sourcePath: 'js',
            bundler: { enable: true, module: 'rollup' },
            bundles: [{ config: {} }]
          }
        })

        captureLogs.start()
        try {
          await app.initServer()
        } finally {
          captured = captureLogs.stop()
        }
      } finally {
        Module._load = realLoad
      }

      assert.ok(captured.includes('failed to include your JS bundler'), `expected a missing bundler error, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(captured.includes('rollup'), 'the error should name the module the app needs to install')
      assert.ok(captured.includes('JS bundling has been disabled'), 'bundling should be switched off rather than crashing the app')
    })
  })

  // roosevelt installs none of these; they are dev dependencies here for the same reason less, sass, and stylus are
  describe('supported bundlers', () => {
    const bundlers = [
      {
        module: 'rspack',
        config: () => ({ entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'entry.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'out.js' } })
      },
      {
        module: 'esbuild',
        config: () => ({ entryPoints: [rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'entry.js'))], bundle: true, outfile: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js/out.js')) })
      },
      {
        module: 'rollup',
        config: () => ({ input: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'entry.js')), output: { file: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js/out.js')), format: 'iife' } })
      }
    ]

    for (const bundler of bundlers) {
      describe(bundler.module, () => {
        // each bundler is handed the same two files so that the dependency it reports can be checked
        function writeSources () {
          fs.outputFileSync(path.join(appDir, 'statics/js/helper.js'), 'export const helper = () => "hi"\n')
          fs.outputFileSync(path.join(appDir, 'statics/js/entry.js'), 'import { helper } from "./helper.js"\nconsole.log(helper())\n')
        }

        function config () {
          return {
            ...appConfig,
            js: {
              sourcePath: 'js',
              bundler: { enable: true, module: bundler.module },
              bundles: [{ config: bundler.config() }]
            }
          }
        }

        it('should write a bundle', async () => {
          writeSources()

          await roosevelt(config()).initServer()

          const output = path.join(appDir, 'public/js/out.js')
          assert.ok(fs.pathExistsSync(output), `${bundler.module} did not write a bundle`)
          assert.ok(fs.readFileSync(output, 'utf8').includes('hi'), 'the bundle should contain the code it was pointed at')
        })

        it('should skip the rebuild when nothing changed, and rebuild when a source it read changes', async () => {
          writeSources()

          await roosevelt(config()).initServer()
          const output = path.join(appDir, 'public/js/out.js')
          const first = fs.statSync(output).mtimeMs

          await roosevelt(config()).initServer()
          assert.strictEqual(fs.statSync(output).mtimeMs, first, 'nothing changed, so the bundle should not have been rewritten')

          // the imported file is the interesting one: it proves the bundler reported its dependencies, not just its entry point
          fs.outputFileSync(path.join(appDir, 'statics/js/helper.js'), 'export const helper = () => "changed"\n')
          await roosevelt(config()).initServer()

          assert.ok(fs.readFileSync(output, 'utf8').includes('changed'), 'editing an imported file should have triggered a rebuild')
        })
      })
    }
  })

  describe('bundling error handling', () => {
    // a custom bundler that always throws is the simplest way to reach the error handler
    function explodingConfig (verbose) {
      return {
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        js: {
          sourcePath: 'js',
          verbose,
          bundler: { enable: true },
          bundles: [{ config: {} }],
          customBundlerFunction: () => { throw new Error('bundling exploded') }
        }
      }
    }

    // a stack trace is what only the verbose error prints, so it is what tells the two apart
    const stackTrace = /\n\s+at /

    it('should log a terse error when verbose is off', async () => {
      const captured = await captureInit(explodingConfig(false))

      assert.ok(captured.includes('JS bundling error: bundling exploded'), `expected a terse error, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(!stackTrace.test(captured), `expected no stack trace from a terse error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should log a verbose error when verbose is on', async () => {
      const captured = await captureInit(explodingConfig(true))

      assert.ok(captured.includes('Error: bundling exploded') && stackTrace.test(captured), `expected the whole error with its stack trace, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(!captured.includes('JS bundling error: bundling exploded'), `expected the verbose error rather than the terse one, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should write an error file with the real error to the app directory when verbose is set to file', async () => {
      // the tests run from somewhere other than the app directory, which is what shows the file goes to the app rather than to the working directory
      const errorFile = path.join(appDir, 'jsBundlerError.txt')
      const strayFile = path.join(process.cwd(), 'jsBundlerError.txt')
      const strayExisted = fs.pathExistsSync(strayFile)

      await captureInit(explodingConfig('file'))

      assert.ok(fs.pathExistsSync(errorFile), 'jsBundlerError.txt should have been written to the app directory')
      const contents = fs.readFileSync(errorFile, 'utf8')
      assert.ok(contents.includes('bundling exploded'), `the error file should say what went wrong, got: ${JSON.stringify(contents)}`)
      assert.ok(stackTrace.test(contents), 'the error file should include the stack trace')
      if (!strayExisted) assert.strictEqual(fs.pathExistsSync(strayFile), false, 'jsBundlerError.txt should not have been written to the working directory')
    })

    it('should write the errors webpack reports to the error file', async () => {
      // webpack reports its errors as plain objects, which used to be written as the text of an empty object
      await captureInit({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
        js: {
          sourcePath: 'js',
          verbose: 'file',
          bundler: { enable: true, module: 'webpack' },
          bundles: [{ config: { mode: 'production', entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'doesNotExist.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'out.js' } } }]
        }
      })

      const contents = fs.readFileSync(path.join(appDir, 'jsBundlerError.txt'), 'utf8')
      assert.ok(contents.includes('doesNotExist.js'), `the error file should contain webpack's error, got: ${JSON.stringify(contents)}`)
    })
  })

  describe('webpack configs', () => {
    const quietConfig = bundles => ({
      ...appConfig,
      js: {
        sourcePath: 'js',
        bundler: { enable: true, module: 'webpack' },
        bundles
      }
    })

    // a config can be an array of configs, which webpack builds together and reports on with one set of stats per config
    it('should build an array of webpack configs', async () => {
      fs.writeFileSync(path.join(appDir, 'statics/js/b.js'), 'module.exports = 2\n')
      await roosevelt(quietConfig([{
        config: [
          { mode: 'production', entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'a.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'first.js' } },
          { mode: 'production', entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'b.js')), output: { path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')), filename: 'second.js' } }
        ]
      }])).initServer()

      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/js/first.js')), 'the first config was not built')
      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/js/second.js')), 'the second config was not built')

      // the stats of both configs were read, so the build cache knows about both bundles
      const cache = fs.readJsonSync(path.join(appDir, '.build/buildCache.json'))
      const outputs = Object.keys(cache.artifacts['js:bundle:0'].outputs)
      assert.ok(outputs.includes(path.join(appDir, 'public/js/first.js')) && outputs.includes(path.join(appDir, 'public/js/second.js')), `both bundles should be recorded, got: ${outputs}`)
    })

    // webpack writes to dist in its working directory when the config does not say where, which roosevelt used to fail to read back
    it('should build a webpack config that does not set an output path', async () => {
      // minifying is switched off because the minifier runs in worker processes, which load this test suite's setup file by a path relative to the working directory this test changes
      fs.writeFileSync(path.join(appDir, 'webpack.config.js'), "module.exports = { mode: 'production', optimization: { minimize: false }, context: __dirname, entry: './statics/js/a.js', output: { filename: 'noPath.js' } }\n")

      // webpack's default output path is the dist folder of the working directory, so the test works from the app directory to keep it there
      const cwd = process.cwd()
      process.chdir(appDir)
      let captured
      try {
        captured = await captureInit({ ...quietConfig([{ config: 'webpack.config.js' }]), logging: { methods: { http: false, info: false, warn: false, verbose: false } } })
      } finally {
        process.chdir(cwd)
      }

      assert.ok(fs.pathExistsSync(path.join(appDir, 'dist/noPath.js')), 'the bundle was not written to webpack\'s default output path')
      assert.ok(!captured.includes('JS bundling error'), `the build should not have failed, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should rebuild when a file the config file requires changes', async () => {
      fs.writeFileSync(path.join(appDir, 'webpack.common.js'), "module.exports = { filename: 'common.js' }\n")
      fs.writeFileSync(path.join(appDir, 'webpack.config.js'), "const path = require('path')\nconst common = require('./webpack.common.js')\nmodule.exports = { mode: 'production', context: __dirname, entry: './statics/js/a.js', output: { path: path.join(__dirname, 'public/js'), filename: common.filename } }\n")

      // an absolute config path is used as it is rather than being joined onto the app directory
      const bundles = [{ config: path.join(appDir, 'webpack.config.js') }]
      await roosevelt(quietConfig(bundles)).initServer()
      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/js/common.js')), 'the bundle was not built from the shared config')

      fs.writeFileSync(path.join(appDir, 'webpack.common.js'), "module.exports = { filename: 'edited.js' }\n")
      await roosevelt(quietConfig(bundles)).initServer()
      assert.ok(fs.pathExistsSync(path.join(appDir, 'public/js/edited.js')), 'editing the shared config should have rebuilt the bundle from its new contents')
    })
  })

  describe('source map warning', () => {
    it('should warn when the public folder has map files in production mode', async () => {
      fs.outputFileSync(path.join(appDir, 'public/js/bundle.js.map'), '{}')

      const captured = await captureInit({
        ...appConfig,
        mode: 'production',
        prodSourceMaps: false,
        logging: { methods: { http: false, info: false, verbose: false } },
        js: { sourcePath: 'js', bundler: { enable: false } }
      })

      assert.ok(captured.includes('source map'), `expected a source map warning, got: ${JSON.stringify(captured.slice(0, 400))}`)
    })

    it('should not warn about map files when prodSourceMaps is enabled', async () => {
      fs.outputFileSync(path.join(appDir, 'public/js/bundle.js.map'), '{}')

      const captured = await captureInit({
        ...appConfig,
        mode: 'production',
        prodSourceMaps: true,
        logging: { methods: { http: false, info: false, verbose: false } },
        js: { sourcePath: 'js', bundler: { enable: false } }
      })

      assert.strictEqual(captured.includes('source map (`.map`) files'), false)
    })
  })
})
