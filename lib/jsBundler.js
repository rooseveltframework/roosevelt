require('@colors/colors')
const path = require('path')
const fs = require('fs-extra')
const requireFromApp = require('./tools/requireFromApp')

// the bundlers roosevelt knows how to drive
//
// roosevelt does not ship any of them, the same way it does not ship a CSS preprocessor; the app installs the one it wants and names it in js.bundler.module
//
// each entry loads its module and runs one bundle, reporting back:
//   outputs: every file the bundle produced
//   sources: every file the bundle read, which is what lets roosevelt skip the build next time when none of them changed
//   written: the subset of outputs actually rewritten this run, for logging; defaults to all of them
const bundlers = {
  // webpack and rspack take the same config and hand back the same stats object, so one implementation drives both
  webpack: webpackLike('webpack', load => load('webpack')),
  rspack: webpackLike('@rspack/core', load => load('@rspack/core').rspack),

  esbuild: {
    module: 'esbuild',
    load: load => load('esbuild'),
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
    load: load => load('rollup'),
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
      //
      // a config can also be an array of configs, each of which gets them
      for (const single of [].concat(config)) {
        if (params.mode === 'development') {
          if (!single.mode) single.mode = 'development' // only add this if mode isn't already set in the user's config
          if (!single.devtool) single.devtool = 'source-map' // only add this if devtool isn't already set in the user's config
        }
        if (params.prodSourceMaps) single.devtool = 'source-map' // enable source maps in prod mode if the setting is set
      }

      bundler(config, (err, stats) => {
        // this runs as a callback rather than as part of a promise chain, so anything it throws would otherwise escape as an uncaught exception rather than being reported as a bundling error
        try {
          if (err) return reject(err)
          if (stats.hasErrors()) {
            // the errors webpack reports are plain objects rather than Errors, so they are turned into one that carries every message
            const errors = stats.toJson({ all: false, errors: true }).errors || []
            const error = new Error(errors.map(error => typeof error === 'string' ? error : error.message).join('\n\n') || 'the bundler reported errors')
            error.errors = errors
            return reject(error)
          }

          // a config can be an array of configs, which makes webpack hand back a MultiStats with one stats object per config rather than a single one
          const outputs = []
          const written = []
          const sources = []
          for (const single of stats.stats || [stats]) {
            // the output path is read from the compilation rather than the config, since webpack fills in its default when the config does not set one
            const outputPath = single.compilation.outputOptions.path

            // webpack includes assets in toJson by default and rspack does not, so both are asked for them explicitly
            const assets = single.toJson({ all: false, assets: true }).assets || []
            for (const asset of assets) {
              outputs.push(path.join(outputPath, asset.name))
              if (asset.emitted) written.push(path.join(outputPath, asset.name)) // these bundlers skip rewriting a file that has not changed
            }
            sources.push(...single.compilation.fileDependencies)
          }
          resolve({ outputs, written, sources })
        } catch (err) {
          reject(err)
        }
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
        bundlerModule = bundler.load(name => requireFromApp(app.get('appDir'), name, require)) // the bundler is the app's to install, so it is loaded from the app
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
          // process config as a file path, which can be absolute or relative to the app
          //
          // node files a module under the name it resolves to, extension and all, so that is the name it is looked up by
          let configPath = path.resolve(appDir, bundle.config)
          try {
            configPath = require.resolve(configPath)
          } catch {
            // a config that cannot be found fails to load below, which reports it
          }

          // node keeps what it requires, so a config edited since the last build would otherwise keep bundling from the old one
          //
          // the same goes for the app's own files the config requires, such as a webpack.common.js shared by several configs
          for (const file of localModules(configPath)) delete require.cache[file]

          config = require(configPath)

          // the config and the app's own files it requires are all sources of the bundle, so an edit to a shared config builds it again
          extraSources.push(...localModules(configPath))
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
        //
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
        // an Error has no properties JSON.stringify can see, so it wrote {}, and a webpack error that refers back to itself made it throw, so the error is written as text instead
        //
        // it goes in the app's own folder rather than wherever the process happened to be started from
        const errorFile = path.join(appDir, 'jsBundlerError.txt')
        try {
          fs.writeFileSync(errorFile, errorText(err))
        } catch (writeErr) {
          logger.error(writeErr)
        }
      }
    } else {
      logger.error(`JS bundling error: ${err?.message ?? err}`)
    }
  }

  // the error as text: its stack, which starts with its message, followed by each error the bundler reported, which carry details such as the file and line that the combined message does not
  function errorText (err) {
    let text = err instanceof Error ? (err.stack || String(err)) : (err?.message ?? String(err))
    for (const error of err?.errors || []) {
      if (error && typeof error === 'object') text += `\n\n${[error.moduleName || error.moduleIdentifier, error.loc].filter(Boolean).join(' ')}\n${error.details || error.stack || error.message || ''}`.trimEnd()
    }
    return text + '\n'
  }
}

// a module and every module of the app's own it requires, followed down through what those require too, leaving out anything in node_modules
//
// this is read from node's require cache, so it finds what the module required the last time it was loaded, which is what has to be dropped from the cache for it to load again, and then, once loaded again, what it requires now
function localModules (file) {
  const found = new Set([file])
  const visit = mod => {
    for (const child of mod?.children || []) {
      if (found.has(child.filename) || child.filename.split(path.sep).includes('node_modules')) continue
      found.add(child.filename)
      visit(child)
    }
  }
  visit(require.cache[file])
  return [...found]
}
