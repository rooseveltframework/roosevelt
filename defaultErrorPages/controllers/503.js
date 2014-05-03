var path = require('path');

module.exports = function(app, req, res) {
  res.setHeader('Connection', 'close');
  res.status(503);
  res.render(path.normalize(__dirname + '/../views/503'), {
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('package').version
  });
};