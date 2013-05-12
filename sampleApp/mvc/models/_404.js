var model = function(req, res) {
  model.data = {};
  app.emit('_404Ready', res, model.data);
};

module.exports = model;