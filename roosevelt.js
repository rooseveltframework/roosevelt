/**
 * Roosevelt MVC web framework
 * @author Eric Newport (kethinov)
 * @license Creative Commons Attribution 3.0 Unported License http://creativecommons.org/licenses/by/3.0/deed.en_US
 */

/*! @source https://github.com/kethinov/roosevelt */
/*jshint camelcase: true, curly: true, indent: 2, eqeqeq: false, forin: false, strict: false, trailing: true, evil: true, devel: true, node: true */

// constructor
var roosevelt = function(params) {

  // define empty params object if no params are passed
  params = params || {};

  // require dependencies
  var fs = require('fs'),           // utility library for filesystem access
      path = require('path'),       // utilities for handling and transforming file paths
      express = require('express'), // express http server
      app = express(),              // initialize express
      teddy = require('teddy'),     // teddy templating engine

      // configure express
      expressConfig = function() {

        // declare variables
        var appdir,           // directory the main module is located in
            viewsPath,        // where the views are located
            controllersPath,  // where the controllers are located
            controllerFiles,  // list of controller files
            staticsRoot,      // where the root folder for statics is located
            imagesPath,       // where the image files are located
            cssPath,          // where the CSS files are located
            lessPath,         // where the LESS files are located
            jsPath,           // where the JS files are located
            i,                // temp var for looping
            controllerName,   // temp var for controller iterating
            controllerMethod, // temp var for controller iterating
            controllers = []; // controller methods to be stored here

        // expose submodules
        roosevelt.express = express;
        roosevelt.expressApp = app;
        roosevelt.teddy = teddy;

        // gets full path of mainModule
        appdir = path.normalize(process.mainModule.filename.replace(process.mainModule.filename.split('/')[process.mainModule.filename.split('/').length - 1], ''));

        // where the models are located
        roosevelt.modelsPath = params.modelsPath ? appdir + params.modelsPath : appdir + 'mvc/models/';

        // where the views are located
        viewsPath = params.viewsPath ? appdir + params.viewsPath : appdir + 'mvc/views/';

        // where the controllers are located
        controllersPath = params.controllersPath ? appdir + params.controllersPath : appdir + 'mvc/controllers/';

        // build list of controller files
        try {
          controllerFiles = fs.readdirSync(controllersPath);
        }
        catch (e) {
          console.log("\nRoosevelt fatal error: could not load controller files from " + controllersPath + "\n");
          console.log(e);
        }

        // set statics folder
        staticsRoot = params.staticsRoot || 'statics';
        staticsRoot += '/';
        params.staticsPrefix = params.staticsPrefix || '';

        // set custom paths
        imagesPath  = params.imagesPath ? appdir + params.imagesPath : appdir + staticsRoot + 'i/';
        cssPath = params.cssPath ? appdir + params.cssPath : appdir + staticsRoot + 'css/';
        lessPath = params.lessPath ? appdir + params.lessPath : appdir + staticsRoot + 'less/';
        jsPath  = params.jsPath ? appdir + params.jsPath : appdir + staticsRoot + 'js/';

        // activate LESS middleware
        app.use(require('less-middleware')({

          // pathing options
          src: lessPath,
          dest: cssPath,
          prefix: params.staticsPrefix ? '/' + params.staticsPrefix + '/' + (params.cssPath || 'css') : '/' + (params.cssPath || 'css'),
          root: lessPath,

          // performance options
          once: true,       // compiles less files only once per server start (restart server to recompile altered LESS files into new CSS files)
          yuicompress: true // enables YUI Compressor
        }));

        // set port
        app.set('port', params.port || process.env.NODE_PORT || 43711);

        // set templating engine
        app.set('views', viewsPath);
        app.set('view engine', 'html');
        app.engine('html', teddy.__express);

        // dumps http requests to the console
        app.use(express.logger());

        // defines req.body by parsing http requests
        app.use(express.bodyParser());

        // map statics
        app.use('/' + params.imagesPath, express.static(imagesPath));
        app.use('/' + params.cssPath, express.static(cssPath));
        app.use('/' + params.lessPath, express.static(lessPath));
        app.use('/' + params.jsPath, express.static(jsPath));
        app.use('/' + params.staticsPrefix, express.static(appdir + staticsRoot));

        // load all controllers
        for (i in controllerFiles) {
          controllerName = controllerFiles[i];

          // strip .js
          controllerName = controllerName.substring(0, controllerName.length - 3);

          // map routes
          controllers[controllerName] = require(controllersPath + controllerName);
          controllerMethod = controllers[controllerName];
          if (controllerMethod.middleware) {
            app.all('/' + controllerName, controllerMethod.middleware, controllerMethod);
            app.all('/' + controllerName + '/*', controllerMethod.middleware, controllerMethod);
          }
          else {
            app.all('/' + controllerName, controllerMethod);
            app.all('/' + controllerName + '/*', controllerMethod);
          }
        }

        // map index, 404 routes
        if (controllers.index.middleware) {
          app.all('/', controllers.index.middleware, controllers.index);
        }
        else {
          app.all('/', controllers.index);
        }
        if (controllers._404.middleware) {
          app.all('*', controllers._404.middleware, controllers._404);
        }
        else {
          app.all('*', controllers._404);
        }

        if (params.customConfigs && typeof params.customConfigs === 'function') {
          params.customConfigs();
        }
      },

      startServer = function() {
        console.log((params.name || 'Roosevelt Express') + ' server listening on port ' + app.get('port') + ' (' + app.get('env') + ' mode)');
      };

  // configure express and start server
  app.configure(expressConfig);
  app.listen(app.get('port'), startServer);
};

// expose event emitter
roosevelt.events = require('events');
roosevelt.emitter = new roosevelt.events.EventEmitter();
roosevelt.addListener = roosevelt.emitter.addListener;
roosevelt.on = roosevelt.emitter.on;
roosevelt.once = roosevelt.emitter.once;
roosevelt.removeListener = roosevelt.emitter.removeListener;
roosevelt.removeAllListeners = roosevelt.emitter.removeAllListeners;
roosevelt.setMaxListeners = roosevelt.emitter.setMaxListeners;
roosevelt.listeners = roosevelt.emitter.listeners;
roosevelt.emit = roosevelt.emitter.emit;

// flushes require cache and loads a model
roosevelt.loadModel = function(model) {
  delete require.cache[require.resolve(roosevelt.modelsPath + model)];
  return require(roosevelt.modelsPath + model);
};

module.exports = roosevelt;