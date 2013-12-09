module.exports = function(app) {
  app.all('*', function(req, res) {
    res.status(404);
    res.render(__dirname + '/../views/404', {
      url: req.url,
      appName: app.get('appName'),
      appVersion: app.get('package').version
    });
  });
};