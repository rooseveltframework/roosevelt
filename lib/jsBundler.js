require('@colors/colors')
const path = require('path')
const fs = require('fs-extra')

// the bundlers roosevelt knows how to drive
// roosevelt does not ship any of them, the same way it does not ship a CSS preprocessor; the app installs the one it wants and names it in js.bundler.module
//
// each entry loads its module and runs one bundle, reporting back:
//   outputs: every file the bundle produced
//   sources: every file the bundle read, which is what lets roosevelt skip the build next time when none of them changed
//   written: the subset of outputs actually rewritten this run, for logging; defaults to all of them
const bundlers = {
  // webpack and rspack take the same config and hand back the same stats object, so one implementation drives both
  webpack: webpackLike('webpack', () => require('webpack')),
  rspack: webpackLike('@rspack/core', () => require('@rspack/core').rspack),

  esbuild: {
    module: 'esbuild',
    load: () => require('esbuild'),
    run: async (esbuild, config, { params }) => {
      const options = { ...config, metafile: true } // metafile is what makes esbuild report the files it read and wrote
      if (options.minify === undefined) options.minify = params.mode !== 'development'
      if (options.sourcemap === undefined) options.sourcemap = params.mode === 'development' || params.prodSourceMaps
      const result = await esbuild.build(options)
      return {
        outputs: Object.keys(result.metafile.outputs).map(file => path.resolve(file)),
        sources: Object.keys(result.metafile.inputs).map(file => path.resolve(file))
      }
    }
  },

  rollup: {
    module: 'rollup',
    load: () => require('rollup'),
    run: async (rollup, config, { params }) => {
      // rollup splits its config in two: what to read and what to write
      const { output = {}, ...input } = config
      if (output.sourcemap === undefined) output.sourcemap = params.mode === 'development' || params.prodSourceMaps
      const bundle = await rollup.rollup(input)
      try {
        const result = await bundle.write(output)
        const dir = output.dir || path.dirname(output.file || '')
        return {
          outputs: result.output.map(chunk => path.resolve(dir, chunk.fileName)),
          sources: bundle.watchFiles.map(file => path.resolve(file)) // rollup calls the files it read its watch files
        }
      } finally {
        await bundle.close()
      }
    }
  }
}

// webpack and rspack share everything except which module gets loaded
function webpackLike (moduleName, load) {
  return {
    module: moduleName,
    load,
    run: (bundler, config, { params }) => new Promise((resolve, reject) => {
      // these defaults are written in webpack's own config vocabulary, so they live here rather than being applied to every bundler
      if (params.mode === 'development') {
        if (!config.mode) config.mode = 'development' // only add this if mode isn't already set in the user's config
        if (!config.devtool) config.devtool = 'source-map' // only add this if devtool isn't already set in the user's config
      }
      if (params.prodSourceMaps) config.devtool = 'source-map' // enable source maps in prod mode if the setting is set

      bundler(config, (err, stats) => {
        if (err) return reject(err)
        if (stats.hasErrors()) return reject(stats.toJson({ errors: true }).errors[0])

        // webpack includes assets in toJson by default and rspack does not, so both are asked for them explicitly
        const assets = stats.toJson({ assets: true }).assets
        const full = asset => path.join(config.output.path, asset.name)

        resolve({
          outputs: assets.map(full),
          written: assets.filter(asset => asset.emitted).map(full), // these bundlers skip rewriting a file that has not changed
          sources: [...stats.compilation.fileDependencies]
        })
      })
    })
  }
}

module.exports = async app => {
  const params = app.get('params')
  const logger = app.get('logger')
  const appDir = app.get('appDir')
  const appName = app.get('appName')
  const buildCache = app.get('buildCache') || require('./tools/buildCache')(app)
  const startupNotice = require('./tools/startupNotice')(app)

  if (!params.makeBuildArtifacts) return

  // bundling is skipped when it is switched off or there is nothing to build, but the source map check below still runs
  if (params.js.bundler.enable && params.js.bundles.length) await runBundles()

  // check to see if the public folder has .map files in prod mode and warn the user they may want to clear the public folder
  if (process.env.NODE_ENV === 'production' && !params.prodSourceMaps) {
    for (const file of fs.readdirSync(params.publicFolder, { recursive: true })) {
      if (file.endsWith('.map')) {
        startupNotice('sourceMapsInPublic', 'There are source map (`.map`) files in your public folder. If you do not wish to expose these publicly, then clear your public folder and restart the app in production mode.')
        break
      }
    }
  }

  async function runBundles () {
    const customBundler = typeof params.js.customBundlerFunction === 'function' && params.js.customBundlerFunction
    let bundler
    let bundlerModule

    // a custom bundler function replaces the module entirely, so nothing needs to be loaded for it
    if (!customBundler) {
      bundler = bundlers[params.js.bundler.module]

      if (!bundler) {
        logger.error(`${appName} does not have built in support for the "${params.js.bundler.module}" JS bundler. The bundlers it supports are: ${Object.keys(bundlers).join(', ')}. To use a different one, supply a js.customBundlerFunction instead.`)
        logger.warn('JS bundling has been disabled')
        return
      }

      try {
        bundlerModule = bundler.load()
      } catch (err) {
        logger.error(`${appName} failed to include your JS bundler! Please ensure that ${bundler.module} is declared properly in your package.json and that it has been properly installed to node_modules.`)
        logger.warn('JS bundling has been disabled')
        return
      }
    }

    for (const [index, bundle] of params.js.bundles.entries()) {
      if (bundle.env && bundle.env !== params.mode) continue

      // what this bundle is called in the build cache
      const bundleKey = `js:bundle:${index}`

      try {
        let config

        // the bundler does not know about a config file that roosevelt loaded for it, so the build cache is told about it separately
        const extraSources = []

        if (typeof bundle.config === 'string') {
          // process config as a file path
          const configPath = path.join(appDir, bundle.config)

          // node keeps what it requires, so a config edited since the last build would otherwise keep bundling from the old one
          try {
            delete require.cache[require.resolve(configPath)]
          } catch {
            // nothing to drop, so there is nothing stale to worry about either
          }

          config = require(configPath)
          extraSources.push(configPath)
        } else {
          // process as config object
          config = bundle.config
        }

        // run the bundler only if this bundle contains new/edited files
        if (buildCache.isFresh(bundleKey)) continue

        const result = customBundler
          ? await customBundler(bundle, config, app)
          : await bundler.run(bundlerModule, config, { app, params })

        // a bundler that says what it wrote and what it read gets to skip work next time
        // one that reports nothing still builds correctly, it just builds every time
        if (result?.outputs) {
          for (const output of result.written || result.outputs) logger.info('📝', `${appName} writing new JS file ${output}`.green)
          buildCache.record(bundleKey, {
            outputs: result.outputs,
            sources: [...(result.sources || []), ...extraSources]
          })
        }
      } catch (err) {
        // this bundle failed to build, so build it again next time
        buildCache.forget(bundleKey)
        handleBundlingError(err)
      }
    }
  }

  function handleBundlingError (err) {
    if (params.js.verbose) {
      logger.error('JS bundling error:')
      logger.error(err)
      if (params.js.verbose === 'file') {
        fs.writeFileSync('./jsBundlerError.txt', JSON.stringify(err), err => { if (err) logger.error(err) }) // else file written successfully
      }
    } else {
      logger.error(`JS bundling error: ${err.message}`)
    }
  }
}
