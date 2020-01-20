// js bundler

require('colors')

const webpack = require('webpack')

module.exports = (app, callback) => {
  const params = app.get('params')
  const logger = app.get('logger')
  let bundleEnv
  const promises = []

  // use existence of bundles array members to determine if bundler is enabled
  if (!params.js.webpack.bundles.length) {
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
          webpack(bundle.config, (err, stats) => {
            if (err) {
              reject(err)
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
      logger.error(err)
      process.exit(1)
    })
}
