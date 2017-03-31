// html minifier

var minifyHTML = require('express-minify-html');

module.exports = function(app) {
  var params = app.get('params'),
      flags;

  // disable HTML minification if noHTMLMinify param is present in roosevelt
  if (params.noMinify) {
    return;
  }

  // minify the HTML
  else {
    if (!params.htmlMinify) {
      flags = {
        override: true,
        exception_url: false /* eslint camelcase: 0 */
      };
    }

    flags = params.htmlMinify;

    app.use(minifyHTML(flags));
  }
};
