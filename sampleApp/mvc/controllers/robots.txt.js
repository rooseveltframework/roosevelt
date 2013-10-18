module.exports = app.loadModel('robots.txt');
var fs = require('fs');

app.on('robotsReady', function(res, model) {
  res.setHeader('Content-Type', 'text/plain');

  // it's plain text, so we don't want to render it with the template parser
  fs.readFile('mvc/views/robots.txt', 'utf8', function(err, data) {
    res.send(data);
  });
});