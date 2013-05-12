module.exports = app.loadModel('_404');

app.on('_404Ready', function(res, model) {
  res.render('_404.html', model);
});