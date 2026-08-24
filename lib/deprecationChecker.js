// warns about app code and config written for an older version of roosevelt
const Logger = require('roosevelt-logger')
const logger = new Logger()
const fs = require('fs-extra')
const path = require('path')

// only these places are searched when a check needs to look through the app's own code, so that node_modules and build output are never walked
const searchablePaths = ['controllersPath', 'viewsPath', 'modelsPath']

// a single file is never read past this, so that an oversized file cannot stall startup
const maxFileSize = 1024 * 1024

module.exports = (options, params) => {
  let suppliedOptions = options
  let dependencies = {}
  let dependenciesKnown = false

  let manifest = {}
  try {
    manifest = fs.readJsonSync(path.join(params.appDir, 'package.json'))
    dependencies = manifest.dependencies || {}
    dependenciesKnown = true
  } catch {
    // without a readable package.json there is no dependency list to compare against, so the checks below that look for a missing dependency are skipped
    // an unreadable manifest is not evidence that a dependency is absent, and telling someone to add one to a file that isn't there would be nonsense
  }

  // the checks below look at what the app actually asked for, which means the config file as well as the constructor options
  let cfg = {}
  for (const name of ['roosevelt.config.js', 'rooseveltConfig.js']) {
    try {
      // counter-intuitive thing worth noting here: requiring the config runs no app code that has not already run, because roosevelt required the same file while sourcing params, so this is a module cache hit
      cfg = require(path.join(params.appDir, name)) || {}
      break
    } catch {
      // a config that is absent or fails to load leaves the constructor options as the only thing to check
    }
  }
  try {
    suppliedOptions = { ...cfg, ...options }
  } catch (err) {
    // this merge is the only place a param roosevelt does not recognize gets read: source-configs walks the schema, so it never touches them, while the spread above reads every key
    // that makes a throwing getter on a removed param reachable here and nowhere else, and ending startup over a param the app does not even use would be a poor trade, so the constructor options are used on their own
    // but the checks below now cannot see the config file at all, so anything deprecated in there will go unmentioned, and a quiet incomplete check reads exactly like a clean one
    logger.warn(`Roosevelt could not read your config file while checking for deprecated settings, so this check is incomplete: ${err.message}`)
  }

  // does any file in the app's own code contain one of these strings?
  // the search is deliberately narrow: only the directories above, only files that are small enough to be source, and it stops at the first hit
  function appCodeContains (needles) {
    for (const key of searchablePaths) {
      const dir = params[key]
      if (!dir || !fs.existsSync(dir)) continue
      let files
      try {
        files = walkFiles(dir)
      } catch {
        continue
      }
      for (const file of files) {
        let contents
        try {
          if (fs.statSync(file).size > maxFileSize) continue
          contents = fs.readFileSync(file, 'utf8').toLowerCase()
        } catch {
          continue
        }
        for (const needle of needles) {
          if (contents.includes(needle.toLowerCase())) return true
        }
      }
    }
    return false
  }

  // the nodemon config an app is using, whether it lives in package.json or in a file of its own
  function nodemonConfig () {
    if (manifest.nodemonConfig) return manifest.nodemonConfig
    try {
      return fs.readJsonSync(path.join(params.appDir, 'nodemon.json'))
    } catch {
      return null // no nodemon config, so there is nothing to tell anyone to change
    }
  }

  // does any entry in a nodemon watch or ignore list refer to the app's statics folder?
  function mentionsStatics (list) {
    const statics = path.relative(params.appDir, params.staticsRoot).split(path.sep).join('/')
    if (!statics || statics.startsWith('..')) return false // the statics live outside the app directory, so nodemon was never reaching them through it
    return [].concat(list || []).some(entry => {
      const normalized = String(entry).split(path.sep).join('/').replace(/^\.\//, '').replace(/\/+$/, '')
      if (!normalized) return false
      return normalized === statics || statics.startsWith(normalized + '/') || normalized.startsWith(statics + '/') || normalized.startsWith(statics)
    })
  }

  function walkFiles (dir) {
    const found = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) found.push(...walkFiles(full))
      else found.push(full)
    }
    return found
  }

  // npm scripts that call roosevelt's own scripts by their path inside node_modules, which roosevelt now ships as commands instead
  // matching on the path rather than the script name catches these whatever the app decided to call them
  function outdatedScripts () {
    try {
      const scripts = fs.readJsonSync(path.join(params.appDir, 'package.json')).scripts || {}
      return Object.entries(scripts).filter(([, command]) => /node_modules[\\/]roosevelt[\\/]lib[\\/]scripts[\\/]/.test(String(command)))
    } catch {
      return []
    }
  }

  // each check is a condition and the message to print when it is true
  // a message can be a function when it needs to describe what the condition actually found
  // this was refactored to data rather than the easier to read wall of ifs that existed before so a new one can be a single entry, and one that throws does not take the rest down with it
  const checks = [
    [() => fs.existsSync(path.join(params.appDir, 'secrets/csrfSecret.json')), 'The `secrets/csrfSecret.json` file is no longer needed. You can delete it.'],
    [() => suppliedOptions.generateFolderStructure, 'The `generateFolderStructure` param renamed to `makeBuildArtifacts`. You will need to update your Roosevelt config.'],
    [() => suppliedOptions.htmlMinifier, 'The `htmlMinifier` param renamed and expanded to `html`. You will need to update your Roosevelt config.'],
    [() => suppliedOptions.cores, 'The `cores` feature was removed in 0.23.0 since is largely redundant now thanks to the widespread popularity of tools like pm2.'],
    // these were carried along from a session store roosevelt no longer uses, and were never read by the one it does
    [() => suppliedOptions.expressSessionStore?.presetOptions?.ttl !== undefined || suppliedOptions.expressSessionStore?.presetOptions?.max !== undefined, 'The `expressSessionStore.presetOptions.ttl` and `expressSessionStore.presetOptions.max` params were removed in 0.32.0. They never had any effect on the session store Roosevelt ships, so you can delete them. Use `expressSessionStore.maxInactivity` to say how long an abandoned session is kept.'],
    [() => suppliedOptions.toobusy, 'The `toobusy` feature was removed in 0.23.2 since it is temperamental and the dependency is no longer maintained.'],
    [() => suppliedOptions.clientViews && typeof suppliedOptions.clientViews?.enable !== 'boolean', 'You need to add an `enable` param to `clientViews`.'],
    [() => suppliedOptions.onReqAfterRoute, 'The `onReqAfterRoute` method was removed in 0.24.0. Use Express middleware instead.'],
    [() => suppliedOptions.onReqBeforeRoute, 'The `onReqBeforeRoute` method was removed in 0.24.0. Use Express middleware instead.'],
    [() => suppliedOptions.onReqStart, 'The `onReqStart` method was removed in 0.24.0. Use Express middleware instead.'],
    [() => suppliedOptions.onStaticAssetsGenerated, 'The `onStaticAssetsGenerated` method was removed in 0.24.0. Use `onServerInit` instead.'],
    [() => suppliedOptions.isomorphicControllers, 'Replaced `isomorphicControllers` param with `clientControllers` param and made it function similarly to `clientViews`. See 0.26.1 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.26.1'],
    [() => suppliedOptions.secretsDir, 'The `secretsDir` param was renamed to `secretsPath`'],
    [() => suppliedOptions.port, 'The `port` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0'],
    [() => suppliedOptions.https?.force, 'The `https.force` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0'],
    [() => suppliedOptions.https?.authInfoPath, 'The `https.authInfoPath` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0'],
    [() => suppliedOptions.js?.webpack?.bundles?.some?.(bundle => bundle.env === 'dev' || bundle.env === 'prod'), 'The `js.webpack.bundles.env` param now only accepts `development` or `production` as values. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0'],
    [() => suppliedOptions.js?.webpack?.bundles?.some?.(bundle => bundle.env === 'verbose'), 'The `js.webpack.bundles.verbose` param was moved to `js.verbose`. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0'],
    [() => dependenciesKnown && !dependencies.webpack && suppliedOptions.js?.webpack, 'You need to add `webpack` to your dependencies.'],

    // the js bundler now names its bundler the way the css preprocessor names its compiler, and roosevelt ships neither
    [() => suppliedOptions.js?.webpack !== undefined, 'The `js.webpack` param was replaced by `js.bundler`, which names the bundler you want the same way `css.compiler` names your CSS preprocessor. Set `js.bundler` to `{ enable: true, module: \'webpack\' }` and move your bundles up to `js.bundles`. Roosevelt supports webpack, rspack, esbuild, and rollup, none of which it installs for you.'],
    [() => suppliedOptions.js?.customBundler !== undefined, 'The `js.customBundler` param was removed. Supply your bundler function as `js.customBundlerFunction` and put your bundles in `js.bundles`.'],
    [() => suppliedOptions.js?.webpack?.customBundlerFunction, 'The `js.webpack.customBundlerFunction` param was removed. There is now one place to supply your own bundler: `js.customBundlerFunction`.'],
    [() => {
      // a bundler that is turned on but not installed, which is the same mistake as naming a CSS preprocessor you have not installed
      // the module is read with its default applied, because an app that turns bundling on without naming one still gets webpack
      if (!dependenciesKnown || !suppliedOptions.js?.bundler?.enable || suppliedOptions.js?.customBundlerFunction) return false
      const named = suppliedOptions.js.bundler.module || 'webpack'
      const packages = { webpack: 'webpack', rspack: '@rspack/core', esbuild: 'esbuild', rollup: 'rollup' }
      return packages[named] && !dependencies[packages[named]]
    }, 'You have turned on JS bundling with a bundler that is not in your dependencies. Roosevelt does not install bundlers for you, so add the one named in `js.bundler.module` to your `package.json`. It defaults to `webpack` when you do not name one.'],
    [() => {
      // a bundler config file that reaches for terser-webpack-plugin, which roosevelt used to pull in and recent webpack releases no longer include either
      if (!dependenciesKnown || dependencies['terser-webpack-plugin']) return false
      const bundles = suppliedOptions.js?.bundles || suppliedOptions.js?.webpack?.bundles || []
      return bundles.some(bundle => {
        if (typeof bundle.config !== 'string') return false
        try {
          return fs.readFileSync(path.join(params.appDir, bundle.config), 'utf8').includes('terser-webpack-plugin')
        } catch {
          return false // a config file that cannot be read is not this check's problem
        }
      })
    }, 'Your bundler config loads `terser-webpack-plugin`, but it is not in your dependencies. Roosevelt used to load that plugin itself and no longer does, and recent versions of Webpack stopped including it too, so nothing supplies it for you any more. Either add it to your `package.json` or drop it from your config, since Webpack minifies in production without it.'],

    // the config moved from json to js, so that it can hold comments, real numbers and booleans, and values built with rooseveltConfig.ref
    [() => outdatedScripts().length > 0, () => {
      const commands = {
        certsGenerator: 'npx roosevelt-generate-certs',
        secretsGenerator: 'npx roosevelt-generate-secrets',
        sessionSecretGenerator: 'npx roosevelt-generate-session-secret'
      }
      const lines = outdatedScripts().map(([name, command]) => {
        const script = (String(command).match(/(\w+)\.js/) || [])[1]
        if (script === 'csrfSecretGenerator') return `  "${name}" runs a script that no longer exists. CSRF secrets were removed in 0.31.0, so this one only needs deleting.`
        if (commands[script]) return `  "${name}" can be replaced with \`${commands[script]}\`.`
        return `  "${name}" reaches into node_modules by hand and should be removed.`
      })
      return 'Your `package.json` has scripts that run Roosevelt\'s own scripts by their path inside `node_modules`. Roosevelt now ships these as commands that work in any app that depends on it, so these entries can go:\n' + lines.join('\n')
    }],

    [() => fs.existsSync(path.join(params.appDir, 'rooseveltConfig.json')) || fs.existsSync(path.join(params.appDir, 'roosevelt.config.json')), () => {
      // the migration leaves the JSON file alone on purpose, so that its work can be checked before anything is thrown away
      // that means this check fires again on the next start, and telling someone to run a migration they have already run would send them in a circle
      const jsConfig = ['roosevelt.config.js', 'rooseveltConfig.js'].find(name => fs.existsSync(path.join(params.appDir, name)))

      if (jsConfig) return `Roosevelt is reading your \`${jsConfig}\`, but the JSON config it replaced is still sitting next to it. Roosevelt no longer reads the JSON file, so delete it once you are happy with the converted one.`
      return 'Your config is still a JSON file, which Roosevelt no longer reads. Run `npx roosevelt-migrate-config` in your app directory to convert it to `roosevelt.config.js`, then delete the JSON file.'
    }],
    [() => {
      // roosevelt itself no longer looks at this key anywhere, but an app still carrying one is running on defaults without realizing it, so it is worth saying so
      try {
        return !!fs.readJsonSync(path.join(params.appDir, 'package.json')).rooseveltConfig
      } catch {
        return false
      }
    }, 'Your `package.json` has a `rooseveltConfig` key, which Roosevelt no longer reads, so those params are not being applied. Run `npx roosevelt-migrate-config` in your app directory to convert it to `roosevelt.config.js`, then delete the key.'],
    [() => {
      // a value still written in the old template syntax, which now stays a literal string instead of resolving
      let found = false
      ;(function walk (value) {
        if (found) return
        if (typeof value === 'string') found = /\$\{.*\}/.test(value)
        else if (value === Object(value) && typeof value !== 'function') for (const key in value) walk(value[key])
      })(suppliedOptions)
      return found
    }, 'One of your params still uses the old template syntax with a dollar sign and braces. Roosevelt no longer resolves those, so the value is being used as literal text. Replace it with `rooseveltConfig.ref(param => ...)`, which receives the finished params.'],

    [() => process.argv.includes('--webpack='), '--webpack flag is now --jsbundler'],
    [() => process.argv.includes('--wp='), '--wp flag is now --jsb'],
    [() => process.argv.includes('--w='), '--w flag is now --j'],

    // express is now a peer dependency, so the app picks its own version and roosevelt no longer bundles two of them
    [() => suppliedOptions.expressVersion !== undefined, 'The `expressVersion` param was removed. Express is now a peer dependency, so your app installs the version it wants directly. Run `npm install express@4` or `npm install express@5` and remove `expressVersion` from your Roosevelt config.'],
    [() => dependenciesKnown && !dependencies.express, 'You need to add `express` to your dependencies. Express is now a peer dependency, so your app installs it directly rather than getting it through Roosevelt.'],

    // roosevelt rebuilds static files itself now, so a process watcher restarting the whole app when one changes is redundant
    [() => {
      if (!params.watchStatics?.enable) return false
      const nodemon = nodemonConfig()
      if (!nodemon) return false
      if (nodemon.watch && !mentionsStatics(nodemon.watch)) return false // it is only watching places the statics are not in
      return !mentionsStatics(nodemon.ignore)
    }, 'Roosevelt now rebuilds your static files itself as you edit them, but your nodemon config still watches your statics folder, so nodemon restarts your whole app instead and the rebuild never gets to happen. Add your statics folder to nodemon\'s `ignore` list and narrow its `ext` to the server-side files it still needs to watch, such as `"ext": "js json"`. Editing a stylesheet then recompiles just that stylesheet rather than restarting your app. Set `watchStatics.enable` to false if you would rather nodemon keep doing it.'],

    // csrf tokens are no longer required by default, so an app still sending them will have its tokens ignored unless it opts back in
    [() => suppliedOptions.csrfProtection !== false && suppliedOptions.csrfProtection?.requireTokens === undefined && appCodeContains(['csrftoken', '_csrf']),
      'Your app looks like it uses CSRF tokens, but Roosevelt no longer requires them by default. Set `csrfProtection.requireTokens` to `true` to keep requiring them, or remove the tokens from your app since they are no longer needed. Keep them if anything untrusted is hosted on a subdomain you share.']
  ]

  for (const [condition, message] of checks) {
    try {
      if (condition()) logger.error(typeof message === 'function' ? message() : message)
    } catch (err) {
      // one check that cannot run is not a reason to skip the rest, but staying silent about it is how a broken check goes unnoticed
      logger.verbose(`A Roosevelt deprecation check could not run: ${err.message}`)
    }
  }
}
