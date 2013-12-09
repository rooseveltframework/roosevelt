module.exports = function(app, err, req, res) {
  res.status(err.status || 500);
  res.render(__dirname + '/../views/500', {
    url: req.url,
    appName: app.get('appName'),
    appVersion: app.get('package').version
  });
};