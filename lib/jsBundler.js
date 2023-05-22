// js bundler

require('@colors/colors')

const webpack = require('webpack')
const path = require('path')
const fs = require('fs')

module.exports = (app, callback) => {
  const params = app.get('params')
  const logger = app.get('logger')
  let bundleEnv
  const promises = []

  // use existence of bundles array members to determine if bundler is enabled
  if (!params.js.webpack.bundles.length || !params.makeBuildArtifacts) {
    callback()
    return
  }

  // check if app was launched in dev or prod mode
  if (params.mode === 'development') {
    bundleEnv = 'dev'
  } else {
    bundleEnv = 'prod'
  }

  // process each bundle
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

            resolve()
          })
        })
      )
    }
  }

  Promise.all(promises)
    .then(() => {
      callback()
    })
    .catch(err => {
      if (params.js.webpack.verbose) {
        logger.error('Webpack bundling error:')
        logger.error(err)
        if (params.js.webpack.verbose === 'file') {
          fs.writeFileSync('./webpackError', JSON.stringify(err), err => { if (err) console.log(err) }) // else file written successfully
        }
      } else {
        logger.error(`Webpack bundling error: ${err.message}`)
      }
      callback()
    })
}
