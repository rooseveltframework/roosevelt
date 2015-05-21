'use strict';
var http = require('http'),
    express = require('express'),
    colors = require('colors'),
    cluster = require('cluster'),
    os = require('os');

module.exports = function(params) {
  params = params || {};              // ensure params are an object
  var app = express(),                // initialize express
      httpServer = http.Server(app);  // create http server out of the express app

  // expose initial vars
  app.set('express', express);
  app.set('params', params);

  // source user supplied params
  app = require('./lib/sourceParams')(app);

  // enable gzip compression
  app.use(require('compression')());

  // enable cookie parsing
  app.use(require('cookie-parser')());

  // bind user-defined middleware which fires at the beginning of each request if supplied
  if (params.onReqStart && typeof params.onReqStart === 'function') {
    app.use(params.onReqStart);
  }

  // activate css preprocessor
  require('./lib/preprocessCss')(app);

  // activate js compiler
  require('./lib/jsCompiler')(app);

  // configure express
  app = require('./lib/setExpressConfigs')(app);

  // map routes
  app = require('./lib/mapRoutes')(app);

  // fire user-defined onServerInit event
  if (params.onServerInit && typeof params.onServerInit === 'function') {
    params.onServerInit(app);
  }

  // determine number of CPUs to use
  var numCPUs = 1;
  process.argv.some(function(val, index, array) {
    var arg = array[index + 1],
        max = os.cpus().length;

    if (val === '-cores') {
      if (arg === 'max') {
        numCPUs = max;
      }
      else {
        arg = parseInt(arg);
        if (arg <= max && arg > 0) {
          numCPUs = arg;
        }
        else {
          console.warn(((app.get('appName') || 'Roosevelt') + ' warning: invalid value "' + array[index + 1] + '" supplied to -cores param.').red);
          numCPUs = 1;
        }
      }
      return;
    }
  });

  // start server
  var server,
      i,
      gracefulShutdown = function() {
        app.set('roosevelt:state', 'disconnecting');
        console.log(("\n" + (app.get('appName') || 'Roosevelt') + ' received kill signal, attempting to shut down gracefully.').magenta);
        server.close(function() {
          console.log(((app.get('appName') || 'Roosevelt') + ' successfully closed all connections and shut down gracefully.').magenta);
          process.exit();
        });
        setTimeout(function() {
          console.error(((app.get('appName') || 'Roosevelt') + ' could not close all connections in time; forcefully shutting down.').red);
          process.exit(1);
        }, app.get('params').shutdownTimeout);
      };
  
  function startServer() {
    if (cluster.isMaster && numCPUs > 1) {
      for (i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      cluster.on('exit', function(worker, code, signal) {
        console.log(((app.get('appName') || 'Roosevelt') + ' thread ' + worker.process.pid + ' died').magenta);
      });
    }
    else {
      server = httpServer.listen(app.get('port'), (params.localhostOnly && app.get('env') !== 'development' ? 'localhost' : null), function() {
        console.log((app.get('appName') + ' server listening on port ' + app.get('port') + ' (' + app.get('env') + ' mode)').bold);

        // fire user-defined onServerStart event
        if (params.onServerStart && typeof params.onServerStart === 'function') {
          params.onServerStart(app);
        }
      });
      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    }
  }

  return {
    httpServer: httpServer,
    expressApp: app,
    startServer: startServer
  };
};