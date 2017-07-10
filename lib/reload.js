module.exports = function(app) {
  var reload = require('reload');

  if (app.get('params').reload.enabled === true) {
    reload(app, app.get('params').reload.opts);
  }
};
