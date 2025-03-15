require('@colors/colors')
const path = require('path')
const fs = require('fs-extra')

module.exports = async app => {
  const params = app.get('params')
  const logger = app.get('logger')

  // use existence of bundles array members to determine if bundler is enabled
  if (!params.makeBuildArtifacts) return
  if (params.js?.webpack.enable && !params.js.webpack.bundles.length) return
  if (params.js?.customBundler.enable && !params.js.customBundler.bundles.length) return

  if (params.js.webpack) {
    let webpack
    if (params.js.webpack) {
      try {
        webpack = require('webpack')
      } catch (err) {
        logger.error(`${app.get('appName')} failed to include your Webpack JS bundle! Please ensure Webpack is declared properly in your package.json and that it has been properly installed to node_modules.`)
        logger.warn('JS bundling has been disabled')
        return
      }
    }
    for (const bundle of params.js.webpack.bundles) {
      if (bundle.env === params.mode || !bundle.env) {
        try {
          await (async () => {
            let config

            if (typeof bundle.config === 'string') {
              // process config as a file path
              config = require(path.join(app.get('appDir'), bundle.config))
            } else {
              // process as config object
              config = bundle.config
            }

            if (params.js.webpack.customBundlerFunction) {
              await params.js.webpack.customBundlerFunction(bundle, config, app)
            } else {
              // add dev tools to webpack config if in development mode
              if (params.mode === 'development') {
                if (!config.mode) config.mode = 'development' // only add this if mode isn't already set in the user's config
                if (!config.devtool) config.devtool = 'source-map' // only add this if devtool isn't already set in the user's config
              }

              if (params.prodSourceMaps) config.devtool = 'source-map' // enable source maps in prod mode if the setting is set

              await new Promise((resolve, reject) => {
                webpack(config, (err, stats) => {
                  if (err) {
                    reject(err)
                    return
                  }

                  if (stats.hasErrors()) {
                    reject(stats.toJson().errors[0])
                    return
                  }

                  stats.toJson().assets.map(asset => path.join(config.output.path, asset.name)).forEach(file => logger.log('📝', `${app.get('appName')} writing new JS file ${file}`.green))
                  resolve()
                })
              })
            }
          })()
        } catch (err) {
          handleBundlingError(err)
        }
      }
    }
  } else if (params.js.customBundler) {
    for (const bundle of params.js.customBundler.bundles) {
      if (bundle.env === params.mode || !bundle.env) {
        try {
          await (async () => {
            let config

            if (typeof bundle.config === 'string') {
              // process config as a file path
              config = require(path.join(app.get('appDir'), bundle.config))
            } else {
              // process as config object
              config = bundle.config
            }

            if (params.js.customBundler.customBundlerFunction) {
              await params.js.customBundler.customBundlerFunction(bundle, config, app)
            } else {
              throw new Error('No customBundlerFunction defined.')
            }
          })()
        } catch (err) {
          handleBundlingError(err)
        }
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
