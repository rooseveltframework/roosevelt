var path = require('path');

module.exports = function(app, err, req, res) {
  var status = err.status || 500;
  res.status(status);
  res.render(path.normalize(__dirname + '/../views/5xx'), {
    status: status,
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('package').version
  });
};