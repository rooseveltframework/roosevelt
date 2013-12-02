var fs = require('fs'),                           // utility library for filesystem access
    path = require('path'),                       // utilities for handling and transforming file paths
    express = require('express'),                 // express http server
    teddy = require('teddy'),                     // teddy templating engine
    lessMiddleware = require('less-middleware'),  // for LESS CSS preprocessing
    formidable = require('formidable'),           // for multipart forms
    appDir = path.normalize(process.mainModule.filename.replace(process.mainModule.filename.split('/')[process.mainModule.filename.split('/').length - 1], '')),
    package = require(appDir + 'package.json');   // storing contents of package.json for later use

module.exports = function(params) {
  params = params || {};

  var app = express(), // initialize express

      // configure express
      expressConfig = function() {
        runCustomCode();
        setMemberVars();
        activateLessMiddleware();
        setExpressConfigs();
        mapRoutes();
      },

      // run custom express configs if supplied
      runCustomCode = function() {
        if (params.onServerStart && typeof params.onServerStart === 'function') {
          params.onServerStart(app);
        }
      },

      // defines app.get values that roosevelt exposes through express
      setMemberVars = function() {

        // expose submodules
        app.set('express', express);
        app.set('teddy', teddy);
        app.set('formidable', formidable);

        // expose directory the main module is in
        app.set('appDir', appDir);

        // expose package.json
        package.rooseveltConfig = package.rooseveltConfig || {};
        app.set('package', package);

        // define staticsRoot first because other params depend on it
        params.staticsRoot = params.staticsRoot || package.rooseveltConfig.staticsRoot || 'statics/';
        app.set('staticsRoot', path.normalize(params.staticsRoot));

        // source remaining params from params argument, then package.json, then defaults
        params = {
          port: params.port || package.rooseveltConfig.port || process.env.NODE_PORT || 43711,
          modelsPath: params.modelsPath || package.rooseveltConfig.modelsPath || 'mvc/models/',
          viewsPath: params.viewsPath || package.rooseveltConfig.viewsPath || 'mvc/views/',
          controllersPath: params.controllersPath || package.rooseveltConfig.controllersPath || 'mvc/controllers/',
          notFoundPage: params.notFoundPage || package.rooseveltConfig.notFoundPage || '404.js',
          staticsRoot: params.staticsRoot, // defaults hierarchy defined above because below params depend on this one being predefined
          cssPath: params.cssPath || package.rooseveltConfig.cssPath || params.staticsRoot + 'css/',
          lessPath: params.lessPath || package.rooseveltConfig.lessPath || params.staticsRoot + 'less/',
          prefixStaticsWithVersion: params.prefixStaticsWithVersion || package.rooseveltConfig.prefixStaticsWithVersion || false,
          versionNumberLessVar: params.versionNumberLessVar || package.rooseveltConfig.versionNumberLessVar || undefined,
          formidableSettings: params.formidableSettings || package.formidableSettings || {},
          shutdownTimeout: params.shutdownTimeout || package.shutdownTimeout || 30000,
          onServerStart: params.onServerStart || undefined,
          onReqStart: params.onReqStart || undefined,
          onReqBeforeRoute: params.onReqBeforeRoute || undefined,
          onReqAfterRoute: params.onReqAfterRoute || undefined
        };

        // ensure formidableSettings is an object
        if (typeof params.formidableSettings !== 'object') {
          params.formidableSettings = {};
        }

        // add trailing slashes where necessary
        ['modelsPath', 'viewsPath', 'controllersPath'].forEach(function(i) {
          var path = params[i], finalChar = path.charAt(path.length - 1);
          params[i] = finalChar != '/' && finalChar != '\\' ? path : path + '/';
        });

        // map mvc paths
        app.set('modelsPath', path.normalize(appDir + params.modelsPath));
        app.set('viewsPath', path.normalize(appDir + params.viewsPath));
        app.set('controllersPath', path.normalize(appDir + params.controllersPath));

        // map statics paths
        app.set('cssPath', path.normalize(appDir + params.cssPath));
        app.set('lessPath', path.normalize(appDir + params.lessPath));

        // some final param post processing
        params.notFoundPage = app.get('controllersPath') + params.notFoundPage;
        params.staticsPrefix = params.prefixStaticsWithVersion ? package.version || '' : '';

        app.set('params', params);

        // bind user-defined middleware which fires at the beginning of a request if supplied
        if (params.onReqStart && typeof params.onReqStart === 'function') {
          app.use(params.onReqStart);
        }
      },

      // activate LESS CSS preprocessing
      activateLessMiddleware = function() {

        // write app version to version.less to force statics versioning
        if (params.versionNumberLessVar) {
          var versionFile = app.get('lessPath') + 'version.less',
              versionCode = '/* do not edit; generated automatically by Roosevelt */ @' + params.versionNumberLessVar + ': \'' + package.version + '\';';

          if (fs.readFileSync(versionFile, 'utf8') != versionCode) {
            fs.writeFile(versionFile, versionCode, function(err) {
              if (err) {
                console.error((package.name || 'Roosevelt') + ' failed to write version.less file!');
                console.error(err);
              }
              else {
                console.log((package.name || 'Roosevelt') + ' writing new version.less to reflect new version: ' + package.version);
              }
            });
          }
        }

        app.use(lessMiddleware({

          // pathing options
          src: app.get('lessPath'),
          dest: app.get('cssPath'),
          prefix: params.staticsPrefix ? '/' + params.staticsPrefix + '/' + params.cssPath : '/' + params.cssPath,
          root: '/',

          // performance options
          once: true,       // compiles less files only once per server start (restart server to recompile altered LESS files into new CSS files)
          yuicompress: true // enables YUI Compressor
        }));
      },

      // configure specific express options
      setExpressConfigs = function() {

        // set port
        app.set('port', params.port);

        // close connections gracefully if server is being shut down
        app.use(function(req, res, next) {
          if (!app.get('roosevelt:shuttingDown')) {
            next();
          }
          else {
            res.setHeader('Connection', 'close');
            res.send(503, 'Server is in the process of shutting down.');
          }
        });

        // dumps http requests to the console
        app.use(express.logger());

        // defines req.body by parsing http requests
        app.use(express.json());
        app.use(express.urlencoded());

        // set templating engine
        app.set('views', app.get('viewsPath'));
        app.set('view engine', 'html');
        app.engine('html', app.get('teddy').__express);

        // list all view files to determine number of extensions
        var viewFiles = walkSync(app.get('viewsPath')),
            extensions = [];

        // make list of extensions
        viewFiles.forEach(function(file) {
          var extension = file.substring(file.lastIndexOf('.') + 1, file.length);
          extensions[extension] = extension;
        });

        // use teddy as renderer for all view file types
        extensions.forEach(function(i) {
          app.engine(i, app.get('teddy').__express);
        });
      },

      mapRoutes = function() {

        // bind user-defined middleware which fires just before executing the controller if supplied
        if (params.onReqBeforeRoute && typeof params.onReqBeforeRoute === 'function') {
          app.use(params.onReqBeforeRoute);
        }

        // middleware to handle forms with formidable
        app.use(function(req, res, next) {
          var form = new formidable.IncomingForm(params.formidableSettings), contentType = req.headers['content-type'];

          if (typeof contentType === 'string' && contentType.indexOf('multipart/form-data') > -1) {
            form.parse(req, function(err, fields, files) {
              if (err) {
                console.error((package.name || 'Roosevelt') + ' failed to parse multipart form at ' + req.url);
                console.error(err);
              }
              req.body = fields; // pass along form fields
              req.files = files; // pass along files

              // remove tmp files after request finishes
              var cleanup = function(files, events) {

                // prevent event from firing more than once
                events.forEach(function(event) {
                  res.removeListener(event, cleanup);
                });

                // remove tmp file(s)
                Object.keys(files).forEach(function(file) {
                  file = files[file];
                  if (typeof file.path === 'string') {
                    fs.unlink(file.path);
                  }
                });
              };
              res.once('finish', cleanup.bind(null, files, ['close', 'error']));
              res.once('close', cleanup.bind(null, files, ['finish', 'error']));
              res.once('error', cleanup.bind(null, files, ['finish', 'close']));
              next();
            });
          }
          else {
            next();
          }
        });

        // bind user-defined middleware which fires after request ends if supplied
        if (params.onReqAfterRoute && typeof params.onReqAfterRoute === 'function') {
          app.use(function(req, res, next) {
            var afterEnd = function(events) {

              // prevent event from firing more than once
              events.forEach(function(event) {
                res.removeListener(event, afterEnd);
              });

              params.onReqAfterRoute(req, res);
            };
            res.once('finish', afterEnd.bind(null, ['close', 'error']));
            res.once('close', afterEnd.bind(null, ['finish', 'error']));
            res.once('error', afterEnd.bind(null, ['finish', 'close']));
            next();
          });
        }

        // method for roosevelt users to conveniently load models from their controllers
        app.set('model', function(model) {
          return require(app.get('modelsPath') + model);
        });

        // map statics
        app.use('/' + params.staticsPrefix, express.static(appDir + app.get('staticsRoot')));

        // build list of controller files
        var controllerFiles;
        try {
          controllerFiles = walkSync(app.get('controllersPath'));
        }
        catch (e) {
          console.error((package.name || 'Roosevelt') + ' fatal error: could not load controller files from ' + app.get('controllersPath'));
          console.error(e);
        }

        // load all controllers
        controllerFiles.forEach(function(controllerName) {
          if (controllerName.indexOf(params.notFoundPage) < 0) {
            try {
              require(controllerName)(app);
            }
            catch (e) {
              console.error((package.name || 'Roosevelt') + ' failed to load controller file: ' + controllerName + '. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.');
              console.error(e);
            }
          }
        });

        // load 404 controller last so that it doesn't supersede the others
        try {
          require(params.notFoundPage)(app);
        }
        catch (e) {
          console.error((package.name || 'Roosevelt') + ' failed to load 404 controller file: ' + params.notFoundPage + '. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.');
          console.error(e);
        }
      },

      // utility method for listing all files in a directory recursively in a synchronous fashion
      walkSync = function(dir, filelist) {
        var files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function(file) {
          if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
          }
          else {
            filelist.push(dir + file);
          }
        });
        return filelist;
      },

      // callback for when server has started
      startServer = function() {
        console.log((package.name || 'Roosevelt Express') + ' server listening on port ' + app.get('port') + ' (' + app.get('env') + ' mode)');
      },

      config = app.configure(expressConfig),
      server = app.listen(app.get('port'), startServer),
      gracefulShutdown = function() {
        app.set('roosevelt:shuttingDown', true);
        console.log("\n" + (package.name || 'Roosevelt') + ' received kill signal, attempting to shut down gracefully.');
        server.close(function() {
          console.log((package.name || 'Roosevelt') + ' successfully closed all connections and shut down gracefully.');
          process.exit();
        });
        setTimeout(function() {
          console.error((package.name || 'Roosevelt') + ' could not close all connections in time; forcefully shutting down.');
          process.exit(1);
        }, app.get('params').shutdownTimeout);
      };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  return app;
};