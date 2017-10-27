// html minifier

const minifyHTML = require('express-minify-html')

module.exports = function (app) {
  const params = app.get('params')
  const options = params.htmlMinify

  // disable HTML minification if noHTMLMinify param is present in roosevelt
  if (!params.noMinify) {
    app.use(minifyHTML(options))
  }
}
