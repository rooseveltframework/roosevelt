module.exports = function(app) {
  app.get('/', function(req, res) {
    var model = app.get('model')('homepage');
    res.render('homepage', model); // empty model
  });
};