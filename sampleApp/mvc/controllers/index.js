module.exports = function(req, res) {
  res.render('index.html', require('../models/index'));
};