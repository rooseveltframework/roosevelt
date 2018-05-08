// html minifier

module.exports = function (app) {
  const params = app.get('params')
  const options = params.htmlMinify
  const objectMerge = require('lodash.merge')
  const minify = require('html-minifier').minify

  // combine the options given by user with the default parms
  let presetOptions = {
    override: false,
    exception_url: false,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true
    }
  }

  let finalOptions = objectMerge(presetOptions, options)

  // make the exception_url into an array so that we can iterate through them
  if (finalOptions.exception_url.constructor !== Array) {
    finalOptions.exception_url = [finalOptions.exception_url]
  }

  // disable HTML minification if noHTMLMinify param is present in roosevelt
  if (!params.noMinify) {
    app.use(function (req, res, next) {
      let skip = false

      // if the req.url is part of the exception_url array, skip this process
      finalOptions.exception_url.forEach((exceptionURL) => {
        switch (exceptionURL.constructor) {
          case RegExp:
            skip = exceptionURL.test(req.url)
            break
          case Function:
            skip = exceptionURL(req, res) || false
            break
          case String:
            skip = req.url.match(exceptionURL)
            break
          default:
        }
      })

      // Function that will minify HTML and return a function depending if the callback exists or not
      let sendMinifiedHTML = (callback) => {
        // no callback, send back the Minified HTML
        if (typeof callback === 'undefined') {
          return (err, html) => {
            if (err) {
              return next(err)
            }
            html = minify(html, finalOptions.htmlMinifier)
            res.send(html)
          }
        } else {
          // use the callback
          return (err, html) => {
            if (html) {
              html = minify(html, finalOptions.htmlMinifier)
            }
            callback(err, html)
          }
        }
      }

      // give res an extra function (renderMin) in case ppl want to keep original render
      res.renderMin = function (view, renderOpts, callback) {
        this.render(view, renderOpts, sendMinifiedHTML(callback))
      }

      // if override is true and skip is false, make res.render send back the minifiedHTML
      if (finalOptions.override && !skip) {
        res.originalRender = res.render
        res.render = function (view, renderOpts, callback) {
          this.originalRender(view, renderOpts, sendMinifiedHTML(callback))
        }
      }
      next()
    })
  }
}
