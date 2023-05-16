// js bundler

require('@colors/colors')

const webpack = require('webpack')
const path = require('path')

module.exports = (app, callback) => {

  // console.log("*** app")
  // console.log(app)

  const params = app.get('params')
  const logger = app.get('logger')
  let bundleEnv
  const promises = []

  //   console.log("*** logger.params.method.verbos")
  // console.log(logger.params)

  // console.log("*** params")
  // console.log(params)

  console.log("*** logger")
  console.log(logger.params)

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
    console.log("*** bundle")
    console.log(bundle)
    
    if (bundle.env === bundleEnv || !bundle.env) {
      console.log("*** bundle.env")
      console.log(bundle.env)
      
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
            console.log("*** stats")
            console.log(stats)
            console.log("*** config")
            console.log(config)
            
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
      logger.error(`Webpack bundling error:
    ${err.message}`)
      callback()
    })
}
