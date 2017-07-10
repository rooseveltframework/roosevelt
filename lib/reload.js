module.exports = function(app) {
  var params = app.get('params'),
      reload = require('reload');

  if (app.get('params').reload.enabled === true) {
    reload(app, app.get('params').reload.opts);
  }
}
