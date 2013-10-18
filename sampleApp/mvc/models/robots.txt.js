var model = function(req, res) {
  model.data = {};
  app.emit('robotsReady', res, model.data);
};

module.exports = model;