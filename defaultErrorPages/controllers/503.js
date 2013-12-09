module.exports = function(app, req, res) {
  res.setHeader('Connection', 'close');
  res.status(503);
  res.render(__dirname + '/../views/503', {
    url: req.url,
    appName: app.get('appName'),
    appVersion: app.get('package').version
  });
};