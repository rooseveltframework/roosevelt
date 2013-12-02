module.exports = function(app) {
  app.get('/', function(req, res) {
    var model = app.get('model')('index');
    res.render('index', model); // empty model
  });
};