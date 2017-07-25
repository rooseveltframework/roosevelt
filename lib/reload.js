// reload

module.exports = function(app) {
  var reload = require('reload');

  return reload(app, app.get('params').reload.opts);
};
