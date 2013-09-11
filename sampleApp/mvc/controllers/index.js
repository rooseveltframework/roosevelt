module.exports = app.loadModel('index');

app.on('indexReady', function(res, model) {
  res.render('index', model);
});