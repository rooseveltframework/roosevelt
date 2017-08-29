// html minifier

var minifyHTML = require('express-minify-html');

module.exports = function(app) {
  var params = app.get('params'),
      options = params.htmlMinify;

  // disable HTML minification if noHTMLMinify param is present in roosevelt
  if (params.noMinify) {
    return;
  }

  // minify the HTML
  else {
    app.use(minifyHTML(options));
  }
};
