module.exports = function(app) {
  app.get('*', function(req, res) {
    res.status(404);
    res.render('404', {}); // empty model
  });
};