// html minifier

module.exports = function (app) {
  const params = app.get('params').html.minifier
  const options = params.options
  const minify = require('html-minifier').minify

  // check that HTML minifier is enabled and minify is true
  if (app.get('params').minify && params.enable) {
    app.use((req, res, next) => {
      const renderer = res.render
      let exception

      // if the req.url is part of the exceptionRoutes array, skip this process
      if (Array.isArray(params.exceptionRoutes)) {
        params.exceptionRoutes.forEach((exceptionRoutes) => {
          exception = req.url.match(exceptionRoutes)
        })
      } else if (typeof params.exceptionRoutes === 'string') {
        exception = req.url.match(params.exceptionRoutes)
      }

      // initiate the minification if this isn't an exception URL
      if (!exception) {
        res.render = function (view, opts, callback) {
          if (callback) {
            renderer.call(this, view, opts, (err, html) => {
              callback(err, minify(html, options))
            })
          } else {
            renderer.call(this, view, opts, (err, html) => {
              res.send(err || minify(html, options))
            })
          }
        }
      }
      next()
    })
  }
}
