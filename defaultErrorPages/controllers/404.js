var path = require('path');

module.exports = function(app) {
  app.route('*').all(function(req, res) {
    res.status(404);
    res.render(path.normalize(__dirname + '/../views/404'), {
      url: req.url,
      mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
      appVersion: app.get('package').version
    });
  });
};