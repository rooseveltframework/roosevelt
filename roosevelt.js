/**
 * @fileoverview  Roosevelt MVC web framework
 * @author        Eric Newport (kethinov)
 * @license       Creative Commons Attribution 3.0 Unported License http://creativecommons.org/licenses/by/3.0/deed.en_US
 */

/*! @source https://github.com/kethinov/roosevelt */
/*jshint camelcase: true, caseindent: true, curly: true, devel: true, evil: true, indent: 2, node: true */

// constructor
var roosevelt = function(params) {

  // define empty params object if no params are passed
  params = params || {};
  params.staticsPrefix = params.staticsPrefix || '';

  // require dependencies
  var fs = require('fs'),           // utility library for filesystem access
      path = require('path'),       // utilities for handling and transforming file paths
      express = require('express'), // express http server
      app = express(),              // initialize express

      // configure express
      expressConfig = function() {
        setRooseveltPathing();
        activateLessMiddleware();
        setExpressConfigs();
        mapStatics();
        mapRoutes();

        // run custom express configs if supplied
        if (params.customConfigs && typeof params.customConfigs === 'function') {
          params.customConfigs();
        }
      },

      setRooseveltPathing = function() {

        // expose submodules
        roosevelt.params = params;
        roosevelt.express = express;
        roosevelt.teddy = require('teddy');

        // directory the main module is in
        roosevelt.appdir = path.normalize(process.mainModule.filename.replace(process.mainModule.filename.split('/')[process.mainModule.filename.split('/').length - 1], ''));
        // where the models are located
        roosevelt.modelsPath = params.modelsPath ? roosevelt.appdir + params.modelsPath : roosevelt.appdir + 'mvc/models/';

        // where the views are located
        roosevelt.viewsPath = params.viewsPath ? roosevelt.appdir + params.viewsPath : roosevelt.appdir + 'mvc/views/';

        // where the controllers are located
        roosevelt.controllersPath = params.controllersPath ? roosevelt.appdir + params.controllersPath : roosevelt.appdir + 'mvc/controllers/';

        // set statics folder
        roosevelt.staticsRoot = params.staticsRoot || 'statics';
        roosevelt.staticsRoot += '/';

        // set custom paths
        roosevelt.imagesPath = params.imagesPath ? roosevelt.appdir + params.imagesPath : roosevelt.appdir + roosevelt.staticsRoot + 'i/';
        roosevelt.cssPath = params.cssPath ? roosevelt.appdir + params.cssPath : roosevelt.appdir + roosevelt.staticsRoot + 'css/';
        roosevelt.lessPath = params.lessPath ? roosevelt.appdir + params.lessPath : roosevelt.appdir + roosevelt.staticsRoot + 'less/';
        roosevelt.jsPath = params.jsPath ? roosevelt.appdir + params.jsPath : roosevelt.appdir + roosevelt.staticsRoot + 'js/';
      },

      activateLessMiddleware = function() {
        app.use(require('less-middleware')({

          // pathing options
          src: roosevelt.lessPath,
          dest: roosevelt.cssPath,
          prefix: params.staticsPrefix ? '/' + params.staticsPrefix + '/' + (params.cssPath || 'css') : '/' + (params.cssPath || 'css'),
          root: roosevelt.lessPath,

          // performance options
          once: true,       // compiles less files only once per server start (restart server to recompile altered LESS files into new CSS files)
          yuicompress: true // enables YUI Compressor
        }));
      },

      setExpressConfigs = function() {

        // set port
        app.set('port', params.port || process.env.NODE_PORT || 43711);

        // dumps http requests to the console
        app.use(express.logger());

        // defines req.body by parsing http requests
        app.use(express.json());
        app.use(express.urlencoded());
        app.use(express.multipart({defer: true}));

        // set templating engine
        app.set('views', roosevelt.viewsPath);
        app.set('view engine', 'html');
        app.engine('html', roosevelt.teddy.__express);

        // list all view files to determine number of extensions
        var viewFiles = walkSync(roosevelt.viewsPath),
            extensions = [],
            i;

        // make list of extensions
        viewFiles.forEach(function(file) {
          var extension = file.substring(file.lastIndexOf('.') + 1, file.length);
          extensions[extension] = extension;
        });

        // use teddy as renderer for all view file types
        for (i in extensions) {
          app.engine(i, roosevelt.teddy.__express);
        }
      },

      mapStatics = function() {
        app.use('/' + params.imagesPath, express.static(roosevelt.imagesPath));
        app.use('/' + params.cssPath, express.static(roosevelt.cssPath));
        app.use('/' + params.lessPath, express.static(roosevelt.lessPath));
        app.use('/' + params.jsPath, express.static(roosevelt.jsPath));
        app.use('/' + params.staticsPrefix, express.static(roosevelt.appdir + roosevelt.staticsRoot));
      },

      mapRoutes = function() {
        var controllerFiles,
            controllers = [],
            controllerMethod,

            // removes temp files uploaded to the server from multipart forms after the page is served
            afterRender = function(req, res, next) {
              req.on('end', function() {
                var form = req.form;
                if (form) {
                  form.on('close', function() {
                    form.openedFiles.forEach(function(file) {
                      fs.unlink(file.path, function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    });
                  });
                }
              });
              next();
            };

        // build list of controller files
        try {
          controllerFiles = fs.readdirSync(roosevelt.controllersPath);
        }
        catch (e) {
          console.log("\nRoosevelt fatal error: could not load controller files from " + roosevelt.controllersPath + "\n");
          console.log(e);
        }

        // load all controllers
        controllerFiles.forEach(function(controllerName) {

          // strip .js
          controllerName = controllerName.substring(0, controllerName.length - 3);

          // map routes
          controllers[controllerName] = require(roosevelt.controllersPath + controllerName);
          controllerMethod = controllers[controllerName];
          if (controllerMethod.middleware) {
            app.all('/' + controllerName, afterRender, controllerMethod.middleware, controllerMethod);
            app.all('/' + controllerName + '/*', afterRender, controllerMethod.middleware, controllerMethod);
          }
          else {
            app.all('/' + controllerName, afterRender, controllerMethod);
            app.all('/' + controllerName + '/*', afterRender, controllerMethod);
          }
        });

        // map index and 404 routes
        if (controllers.index.middleware) {
          app.all('/', afterRender, controllers.index.middleware, controllers.index);
        }
        else {
          app.all('/', afterRender, controllers.index);
        }
        if (controllers._404.middleware) {
          app.all('*', afterRender, controllers._404.middleware, controllers._404);
        }
        else {
          app.all('*', afterRender, controllers._404);
        }
      },

      // utility method for listing all files in a directory recursively in a synchronous fashion
      walkSync = function(dir, filelist) {
        var fs = fs || require('fs'),
            files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function(file) {
          if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
          }
          else {
            filelist.push(file);
          }
        });
        return filelist;
      },

      // callback for when server has started
      startServer = function() {
        console.log((params.name || 'Roosevelt Express') + ' server listening on port ' + app.get('port') + ' (' + app.get('env') + ' mode)');
      };

  // configure express and start server
  app.configure(expressConfig);
  app.listen(app.get('port'), startServer);
  return app;
};

// expose event emitter and create top-level shorthands for common methods
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

// flushes require cache and runs a fresh execution of the model file
roosevelt.loadModel = function(model) {
  delete require.cache[require.resolve(roosevelt.modelsPath + model)];
  return require(roosevelt.modelsPath + model);
};

module.exports = roosevelt;