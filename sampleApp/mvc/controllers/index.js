module.exports = function(req, res) {
  res.render('index.html', app.loadModel('index'));
};