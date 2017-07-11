// reload

module.exports = function(app) {
  var reload = require('reload');

  reload(app, app.get('params').reload.opts);
}
