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

    it('should log a terse error when verbose is off', async () => {
      const captured = await captureInit(explodingConfig(false))

      assert.ok(captured.includes('JS bundling error: bundling exploded'), `expected a terse error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should log a verbose error when verbose is on', async () => {
      const captured = await captureInit(explodingConfig(true))

      assert.ok(captured.includes('JS bundling error:'), `expected a verbose error, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should write an error file when verbose is set to file', async () => {
      const errorFile = path.join(process.cwd(), 'jsBundlerError.txt')
      fs.removeSync(errorFile)

      try {
        await captureInit(explodingConfig('file'))
        assert.ok(fs.pathExistsSync(errorFile), 'jsBundlerError.txt should have been written')
      } finally {
        fs.removeSync(errorFile)
      }
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
