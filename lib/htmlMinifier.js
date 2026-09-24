module.exports = app => {
  const params = app.get('params').html.minifier
  const options = params.options
  const minify = require('html-minifier-terser').minify

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
        // a render that fails is handed on the way it would be if res.render were not wrapped: to the route's own callback when it gave one, and to express's error handling when it did not. the error used to be sent to the visitor as json, stack trace and all, in place of the app's error page, and a failed render with a callback went on to minify html that was never produced
        res.render = function (view, opts, callback) {
          if (typeof opts === 'function') { // res.render(view, callback), which express allows
            callback = opts
            opts = {}
          }
          const done = callback || ((err, html) => err ? req.next(err) : res.send(html))
          renderer.call(this, view, opts, async (err, html) => {
            if (err) return done(err)
            let minified
            try {
              minified = await minify(html, options)
            } catch (minifyErr) {
              return done(minifyErr)
            }
            done(null, minified)
          })
        }
      }
      next()
    })
  }
}
