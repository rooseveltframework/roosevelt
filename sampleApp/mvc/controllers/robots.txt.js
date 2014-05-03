var fs = require('fs');

module.exports = function(app) {
  app.route('/robots.txt').get(function(req, res) {
    res.setHeader('Content-Type', 'text/plain');

    // it's plain text, so we don't want to render it with the template parser
    fs.readFile(app.get(viewsPath) + 'robots.txt', 'utf8', function(err, data) {
      res.send(data);
    });
  });
};