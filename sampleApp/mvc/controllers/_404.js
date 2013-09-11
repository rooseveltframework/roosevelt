module.exports = app.loadModel('_404');

app.on('_404Ready', function(res, model) {
  res.status(404);
  res.render('_404', model);
});