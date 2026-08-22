const { describe, it, after, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const deprecationChecker = require('../lib/deprecationChecker')

describe('deprecation checker', () => {
  const appDir = path.join(__dirname, 'app/deprecationChecker')

  // starts an app in development mode and returns everything it logged
  async function captureChecks (options = {}) {
    let captured = ''
    captureLogs.start()
    delete process.env.NODE_ENV // roosevelt writes this, and it outranks the mode param on the next app built in this process
    try {
      roosevelt({
        appDir,
        mode: 'development',
        makeBuildArtifacts: false,
        csrfProtection: false,
        expressSession: false,
        htmlValidator: { enable: false },
        frontendReload: { enable: false },
        http: { enable: false },
        https: { enable: false },
        logging: { methods: { http: false, info: false, warn: false, verbose: false } },
        ...options
      })
    } finally {
      captured = captureLogs.stop()
    }
    return captured
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
    fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0' } })
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('when it runs', () => {
    it('should run in development mode', async () => {
      assert.ok((await captureChecks({ cores: 4 })).includes('`cores` feature was removed'))
    })

    it('should not run in production mode', async () => {
      const captured = await captureChecks({ mode: 'production', cores: 4 })

      assert.strictEqual(captured.includes('`cores` feature was removed'), false, 'the default is development-mode, so production should be left alone')
    })

    it('should run in every mode when set to true', async () => {
      assert.ok((await captureChecks({ mode: 'production', deprecationChecks: true, cores: 4 })).includes('`cores` feature was removed'))
    })

    it('should not run at all when disabled', async () => {
      const captured = await captureChecks({ deprecationChecks: false, cores: 4 })

      assert.strictEqual(captured.includes('`cores` feature was removed'), false)
    })
  })

  describe('config checks', () => {
    it('should catch a renamed param', async () => {
      assert.ok((await captureChecks({ generateFolderStructure: true })).includes('`makeBuildArtifacts`'))
    })

    it('should catch a removed event', async () => {
      assert.ok((await captureChecks({ onReqStart: () => {} })).includes('`onReqStart`'))
    })

    it('should catch a deprecated webpack bundle env value', async () => {
      const captured = await captureChecks({ js: { webpack: { enable: true, bundles: [{ env: 'dev', config: {} }] } } })

      assert.ok(captured.includes('only accepts `development` or `production`'))
    })

    it('should keep running the remaining checks when one of them throws', () => {
      // the checker is called directly here so that the throwing value reaches a check rather than tripping param sourcing first
      // htmlMinifier is checked before cores, so cores proves the run continued past the failure
      const options = { cores: 4 }
      Object.defineProperty(options, 'htmlMinifier', { get () { throw new Error('boom') }, enumerable: true })

      let captured = ''
      captureLogs.start()
      try {
        deprecationChecker(options, { appDir })
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('`cores` feature was removed'), 'a later check should still have run')
    })

    it('should tell an app with only a JSON config to migrate it', async () => {
      fs.outputJsonSync(path.join(appDir, 'rooseveltConfig.json'), { port: 4321 })

      const captured = await captureChecks()

      assert.ok(captured.includes('npx roosevelt-migrate-config'), 'it should name the command to run')
    })

    it('should stop telling an app that already migrated to migrate again', async () => {
      // the migration leaves the JSON file behind on purpose, so this check fires again on the next start
      fs.outputJsonSync(path.join(appDir, 'rooseveltConfig.json'), { port: 4321 })
      fs.outputFileSync(path.join(appDir, 'rooseveltConfig.js'), 'module.exports = { port: 4321 }\n')

      const captured = await captureChecks()

      assert.ok(!captured.includes('npx roosevelt-migrate-config'), `it should not send them round in a circle, got: ${captured.slice(0, 300)}`)
      assert.ok(captured.includes('delete it'), 'it should ask them to delete the JSON file instead')
      assert.ok(captured.includes('rooseveltConfig.js'), 'and name the file roosevelt is actually reading')
    })

    it('should catch the session store options that never did anything', async () => {
      const captured = await captureChecks({ expressSessionStore: { presetOptions: { ttl: 1000 } } })

      assert.ok(captured.includes('`expressSessionStore.presetOptions.ttl`'), 'it should name the param')
      assert.ok(captured.includes('maxInactivity'), 'and point at the param that does the job')
    })

    it('should catch max as well as ttl', async () => {
      assert.ok((await captureChecks({ expressSessionStore: { presetOptions: { max: 50 } } })).includes('never had any effect'))
    })

    it('should say so when the config file cannot be read into the checks', () => {
      // a param roosevelt does not recognize never reaches source-configs, so a getter on one is only ever read by the merge inside the checker
      const dir = path.join(appDir, 'throwingConfigGetter')
      fs.ensureDirSync(dir)
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0' } })
      fs.outputFileSync(path.join(dir, 'rooseveltConfig.js'), "module.exports = {\n  get someRemovedParam () { throw new Error('boom') }\n}\n")

      let captured = ''
      captureLogs.start()
      try {
        deprecationChecker({ cores: 4 }, { appDir: dir })
      } finally {
        captured = captureLogs.stop()
      }

      // silence here would read as a clean bill of health from a run that never saw the config file
      assert.ok(captured.includes('this check is incomplete'), 'it should say the checks could not see the config file')
      assert.ok(captured.includes('`cores` feature was removed'), 'the checks should still run on the constructor options')
    })
  })

  describe('express peer dependency checks', () => {
    it('should catch the removed expressVersion param', async () => {
      assert.ok((await captureChecks({ expressVersion: 4 })).includes('`expressVersion` param was removed'))
    })

    it('should tell an app that does not depend on express to add it', async () => {
      fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: {} })

      assert.ok((await captureChecks()).includes('add `express` to your dependencies'))
    })

    it('should stay quiet when express is already a dependency', async () => {
      assert.strictEqual((await captureChecks()).includes('add `express` to your dependencies'), false)
    })

    it('should stay quiet when there is no package.json to read', async () => {
      fs.rmSync(path.join(appDir, 'package.json'), { force: true })

      const captured = await captureChecks({ js: { webpack: { enable: true, bundles: [] } } })

      assert.strictEqual(captured.includes('add `express` to your dependencies'), false, 'a missing manifest is not evidence that express is absent')
      assert.strictEqual(captured.includes('add `webpack` to your dependencies'), false, 'a missing manifest is not evidence that webpack is absent')
    })
  })

  describe('config file checks', () => {
    it('should tell an app still carrying a JSON config to migrate', async () => {
      fs.outputJsonSync(path.join(appDir, 'rooseveltConfig.json'), { http: { port: 1 } })

      assert.ok((await captureChecks()).includes('still a JSON file'))
    })

    it('should tell an app still carrying a roosevelt.config.json to migrate', async () => {
      fs.outputJsonSync(path.join(appDir, 'roosevelt.config.json'), { http: { port: 1 } })

      assert.ok((await captureChecks()).includes('still a JSON file'))
    })

    it('should tell an app with a rooseveltConfig key in package.json to migrate', async () => {
      fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0' }, rooseveltConfig: { http: { port: 1 } } })

      const captured = await captureChecks()

      assert.ok(captured.includes('has a `rooseveltConfig` key'), `expected a package.json config warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.ok(captured.includes('not being applied'), 'the warning should say the params are being ignored')
    })

    it('should stay quiet when the app has no leftover JSON config', async () => {
      const captured = await captureChecks()

      assert.strictEqual(captured.includes('still a JSON file'), false)
      assert.strictEqual(captured.includes('has a `rooseveltConfig` key'), false)
    })

    it('should catch a param still written in the old template syntax', async () => {
      // eslint-disable-next-line no-template-curly-in-string
      const captured = await captureChecks({ symlinks: [{ source: '${staticsRoot}/js', dest: 'public/js' }] })

      assert.ok(captured.includes('old template syntax'), `expected a template syntax warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })
  })

  describe('outdated npm script checks', () => {
    function withScripts (scripts) {
      fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0' }, scripts })
    }

    it('should catch every script that reaches into node_modules for a roosevelt script', async () => {
      withScripts({
        'generate-secrets': 'node ./node_modules/roosevelt/lib/scripts/secretsGenerator.js',
        'generate-certs': 'node ./node_modules/roosevelt/lib/scripts/certsGenerator.js',
        'generate-session-secret': 'node ./node_modules/roosevelt/lib/scripts/sessionSecretGenerator.js',
        'generate-csrf-secret': 'node ./node_modules/roosevelt/lib/scripts/csrfSecretGenerator.js',
        start: 'node app.js'
      })

      const captured = await captureChecks()

      assert.ok(captured.includes('generate-secrets'), 'the secrets script should be named')
      assert.ok(captured.includes('npx roosevelt-generate-certs'), 'the certs script should be given its replacement')
      assert.ok(captured.includes('npx roosevelt-generate-session-secret'), 'the session secret script should be given its replacement')
      assert.strictEqual(captured.includes('npm run start'), false, 'a script that has nothing to do with roosevelt should be left out')
    })

    it('should tell the app to simply delete the csrf secret script', async () => {
      withScripts({ 'generate-csrf-secret': 'node ./node_modules/roosevelt/lib/scripts/csrfSecretGenerator.js' })

      const captured = await captureChecks()

      assert.ok(captured.includes('no longer exists'), 'the csrf script has no replacement, since the feature was removed')
      assert.strictEqual(captured.includes('npx roosevelt-generate-csrf'), false, 'there is no command to point at')
    })

    it('should catch these whatever the app named them', async () => {
      withScripts({ 'my-own-name-for-it': 'node ./node_modules/roosevelt/lib/scripts/certsGenerator.js' })

      assert.ok((await captureChecks()).includes('my-own-name-for-it'))
    })

    it('should stay quiet when no script reaches into node_modules', async () => {
      withScripts({ start: 'node app.js', test: 'mocha' })

      assert.strictEqual((await captureChecks()).includes('by their path inside'), false)
    })

    it('should stay quiet when the app has no scripts at all', async () => {
      assert.strictEqual((await captureChecks()).includes('by their path inside'), false)
    })
  })

  describe('js bundler checks', () => {
    it('should catch the replaced js.webpack param', async () => {
      assert.ok((await captureChecks({ js: { webpack: { enable: true, bundles: [] } } })).includes('`js.webpack` param was replaced'))
    })

    it('should catch the removed js.customBundler param', async () => {
      assert.ok((await captureChecks({ js: { customBundler: { enable: true } } })).includes('`js.customBundler` param was removed'))
    })

    it('should catch the removed js.webpack.customBundlerFunction param', async () => {
      assert.ok((await captureChecks({ js: { webpack: { customBundlerFunction: () => {} } } })).includes('one place to supply your own bundler'))
    })

    it('should tell an app that turned bundling on without installing the bundler', async () => {
      const captured = await captureChecks({ js: { bundler: { enable: true, module: 'esbuild' } } })

      assert.ok(captured.includes('not in your dependencies'), `expected a missing bundler warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should apply the default bundler name when the app turned bundling on without naming one', async () => {
      // an app that does not name a bundler still gets webpack, so leaving it out should not hide the warning
      assert.ok((await captureChecks({ js: { bundler: { enable: true } } })).includes('not in your dependencies'))
    })

    it('should stay quiet when the chosen bundler is installed', async () => {
      fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0', esbuild: '0.28.2' } })

      assert.strictEqual((await captureChecks({ js: { bundler: { enable: true, module: 'esbuild' } } })).includes('not in your dependencies'), false)
    })

    it('should stay quiet when the app supplies its own bundler function', async () => {
      assert.strictEqual((await captureChecks({ js: { bundler: { enable: true, module: 'esbuild' }, customBundlerFunction: () => {} } })).includes('not in your dependencies'), false)
    })

    it('should warn when a bundler config file loads terser-webpack-plugin the app does not have', async () => {
      fs.outputFileSync(path.join(appDir, 'webpack.config.js'), "const TerserPlugin = require('terser-webpack-plugin')\nmodule.exports = { optimization: { minimizer: [new TerserPlugin()] } }\n")

      const captured = await captureChecks({ js: { bundler: { enable: true, module: 'webpack' }, bundles: [{ config: 'webpack.config.js' }] } })

      assert.ok(captured.includes('terser-webpack-plugin'), `expected a terser warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    })

    it('should stay quiet about terser when the app depends on it', async () => {
      fs.outputJsonSync(path.join(appDir, 'package.json'), { name: 'test', dependencies: { express: '5.0.0', webpack: '5.0.0', 'terser-webpack-plugin': '5.0.0' } })
      fs.outputFileSync(path.join(appDir, 'webpack.config.js'), "const TerserPlugin = require('terser-webpack-plugin')\nmodule.exports = {}\n")

      const captured = await captureChecks({ js: { bundler: { enable: true, module: 'webpack' }, bundles: [{ config: 'webpack.config.js' }] } })

      assert.strictEqual(captured.includes('Your bundler config loads'), false)
    })

    it('should stay quiet about terser when the config does not mention it', async () => {
      fs.outputFileSync(path.join(appDir, 'webpack.config.js'), 'module.exports = { entry: "./a.js" }\n')

      const captured = await captureChecks({ js: { bundler: { enable: true, module: 'webpack' }, bundles: [{ config: 'webpack.config.js' }] } })

      assert.strictEqual(captured.includes('Your bundler config loads'), false)
    })
  })

  describe('csrf token scanning', () => {
    // writes a controller that reads like an app still using tokens
    function writeTokenUsingController () {
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/form.js'), 'module.exports = (router) => {\n  router.route("/f").get((req, res) => res.render("f", { csrfToken: req.csrfToken() }))\n}\n')
    }

    it('should warn when the app uses tokens but has not turned them on', async () => {
      writeTokenUsingController()

      assert.ok((await captureChecks({ csrfProtection: true })).includes('no longer requires them by default'))
    })

    it('should stay quiet when the app does not use tokens', async () => {
      fs.outputFileSync(path.join(appDir, 'mvc/controllers/plain.js'), 'module.exports = (router) => {\n  router.route("/p").get((req, res) => res.send("hi"))\n}\n')

      assert.strictEqual((await captureChecks({ csrfProtection: true })).includes('no longer requires them by default'), false)
    })

    it('should stay quiet when the app has already turned tokens on', async () => {
      writeTokenUsingController()

      assert.strictEqual((await captureChecks({ csrfProtection: { requireTokens: true } })).includes('no longer requires them by default'), false)
    })

    it('should stay quiet when the app has deliberately turned tokens off', async () => {
      writeTokenUsingController()

      assert.strictEqual((await captureChecks({ csrfProtection: { requireTokens: false } })).includes('no longer requires them by default'), false, 'an explicit choice should not be second guessed')
    })

    it('should stay quiet when csrf protection is disabled entirely', async () => {
      writeTokenUsingController()

      assert.strictEqual((await captureChecks({ csrfProtection: false })).includes('no longer requires them by default'), false)
    })

    it('should not read files outside the app directories it searches', async () => {
      // a token reference in the public folder is build output, not app code, so it should not trigger the warning
      fs.outputFileSync(path.join(appDir, 'public/bundle.js'), 'var csrfToken = "1"')

      assert.strictEqual((await captureChecks({ csrfProtection: true })).includes('no longer requires them by default'), false)
    })
  })
})
