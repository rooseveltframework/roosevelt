module.exports = function(app) {
  app.get('/robots.txt', function(req, res) {
    var fs = require('fs');
    res.setHeader('Content-Type', 'text/plain');

    // it's plain text, so we don't want to render it with the template parser
    fs.readFile('mvc/views/robots.txt', 'utf8', function(err, data) {
      res.send(data);
    });
  });
};