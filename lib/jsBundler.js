require('@colors/colors')
const path = require('path')
const fs = require('fs')

module.exports = async app => {
  const params = app.get('params')
  const logger = app.get('logger')

  // use existence of bundles array members to determine if bundler is enabled
  if (!params.js.webpack.bundles.length || !params.makeBuildArtifacts) return

  // check if app was launched in dev or prod mode
  let bundleEnv
  if (params.mode === 'development') bundleEnv = 'dev'
  else bundleEnv = 'prod'

  let webpack
  try {
    webpack = require('webpack')
  } catch (err) {
    logger.error(`${app.get('appName')} failed to include your Webpack JS bundle! Please ensure Webpack is declared properly in your package.json and that it has been properly installed to node_modules.`)
    logger.warn('JS bundling has been disabled')
    return
  }

  // process each bundle
  const promises = []
  for (const bundle of params.js.webpack.bundles) {
    if (bundle.env === bundleEnv || !bundle.env) {
      promises.push(
        new Promise((resolve, reject) => {
          let config

          if (typeof bundle.config === 'string') {
            // process config as a file path
            config = require(path.join(app.get('appDir'), bundle.config))
          } else {
            // process as config object
            config = bundle.config
          }

          // add dev tools to webpack config if in development mode
          if (app.get('env') === 'development') {
            if (!config.mode) config.mode = 'development' // only add this if mode isn't already set in the user's config
            if (!config.devtool) config.devtool = 'source-map' // only add this if devtool isn't already set in the user's config
          }

          if (params.prodSourceMaps) config.devtool = 'source-map' // enable source maps in prod mode if the setting is set

          // run webpack with specified config
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
      )
    }
  }

  try {
    await Promise.all(promises)
  } catch (err) {
    if (params.js.webpack.verbose) {
      logger.error('Webpack bundling error:')
      logger.error(err)
      if (params.js.webpack.verbose === 'file') {
        fs.writeFileSync('./webpackError', JSON.stringify(err), err => { if (err) logger.error(err) }) // else file written successfully
      }
    } else {
      logger.error(`Webpack bundling error: ${err.message}`)
    }
  }
}
