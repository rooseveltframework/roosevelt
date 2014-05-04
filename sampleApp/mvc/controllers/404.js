module.exports = function(app) {
  app.route('*').all(function(req, res) {
    var model = require('models/global')(req, res);
    model.content.pageTitle = '{content.appTitle} - 404 not found';
    model.host = req.host;
    model.url = req.url;
    model.appVersion = app.get('package').version;
    res.status(404);
    res.render('404', model);
  });
};