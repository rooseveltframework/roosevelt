// configure specific express options
'use strict';

var wrench = require('wrench'),
    morgan = require('morgan'), // express logger
    bodyParser = require('body-parser'), // express body parser
    methodOverride = require('method-override'), // express body parser
    prequire = require('parent-require'),
    colors = require('colors');

module.exports = function(app) {
  var params = app.get('params'),
      viewEngineParam = params.viewEngine,
      defaultEngine,
      registerViewEngine = function(paramValue) {
        var viewExt, viewEngine, viewModule;
        paramValue = paramValue.split(':');
        if (paramValue.length !== 2) {
          console.error(((app.get('appName') || 'Roosevelt') + ' fatal error: viewEngine param must be formatted as "fileExtension: nodeModule"').red);
          throw new Error();
        }
        viewExt = paramValue[0].trim();
        if (!defaultEngine) {
          defaultEngine = viewExt;
          app.set('view engine', viewExt);
        }
        viewEngine = paramValue[1].trim();
        viewModule = prequire(viewEngine);
        app.set(viewEngine, viewModule);
        app.engine(viewExt, (viewModule.__express ? viewModule.__express : viewModule));
      };

  // set port
  app.set('port', params.port);

  // remove unnecessary response headers
  app.disable('x-powered-by');
  app.disable('etag');

  // close connections gracefully if server is being shut down
  app.use(function(req, res, next) {
    if (app.get('roosevelt:state') !== 'disconnecting') {
      next();
    }
    else {
      require(params.error503)(app, req, res);
    }
  });

  // dumps http requests to the console
  if (!params.disableLogger) {
    app.use(morgan());
  }

  // defines req.body by parsing http requests
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());

  // enables PUT and DELETE requests via <input type='hidden' name='_method' value='put'> and suchlike
  app.use(methodOverride());

  // 500 internal server error page
  app.use(function(err, req, res, next){
    console.error(err.stack);
    require(params.error5xx)(app, err, req, res);
  });

  // set templating engine(s)
  app.set('views', app.get('viewsPath'));
  if (Array.isArray(viewEngineParam)) {
    viewEngineParam.forEach(registerViewEngine);
  }
  else if (viewEngineParam !== 'none') {
    registerViewEngine(viewEngineParam);
  }

  return app;
};