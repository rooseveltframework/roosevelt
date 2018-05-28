// html minifier

module.exports = function (app) {
  const params = app.get('params').htmlMinify
  const options = params.options
  const minify = require('html-minifier').minify

  // check that HTML minifier is enabled and noMinify is false
  if (!app.get('params').noMinify && params.enable) {
    app.use((req, res, next) => {
      const renderer = res.render
      let exception

      // if the req.url is part of the exceptionURL array, skip this process
      if (Array.isArray(params.exceptionURL)) {
        params.exceptionURL.forEach((exceptionURL) => {
          exception = req.url.match(exceptionURL)
        })
      } else if (typeof params.exceptionURL === 'string') {
        exception = req.url.match(params.exceptionURL)
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
