// sample static global base model
var model = {
  content: {
    appTitle: 'roosevelt sample app',
    pageTitle: '{content.appTitle}'
  }
};

// extend global model provide additional useful vars at runtime and export it
module.exports = function(req, res) {

  // recalculated each require
  model.currentYear = new Date().getFullYear();
  model.mainDomain = req.headers['x-forwarded-host'] || req.headers.host;

  return model;
};