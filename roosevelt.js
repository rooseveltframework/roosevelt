require('colors');

var http = require('http'),
    https = require('https'),
    express = require('express'),
    cluster = require('cluster'),
    utils = require('./lib/utils'),
    os = require('os'),
    fs = require('fs');

module.exports = function(params) {
  params = params || {}; // ensure params are an object

  // check for command line overrides for NODE_ENV
  process.argv.forEach(function(val, index, array) {
    switch (val) {
      case '-dev':
        process.env.NODE_ENV = 'development';
        params.nodeEnv = 'development';
        break;
      case '-prod':
        process.env.NODE_ENV = 'production';
        params.alwaysHostPublic = true; // only with -prod flag, not when NODE_ENV is naturally set to production
        params.nodeEnv = 'production';
        break;
    }
  });

  var app = express(), // initialize express
      appName,
      appEnv,
      httpServer,
      httpsServer,
      httpsOptions,
      ca,
      passphrase,
      numCPUs = 1,
      servers = [],
      i,
      connections = {},
      initialized = false;

  // expose initial vars
  app.set('express', express);
  app.set('params', params);

  // source user supplied params
  app = require('./lib/sourceParams')(app);

  // use existence of public folder to determine first run
  if (!utils.fileExists(app.get('appDir') + app.get('params').publicFolder)) {
    // run the param audit
    require('./lib/configAuditor');
  }

  appName = app.get('appName'),
  appEnv = app.get('env');

  if (!app.get('suppressLogs')) {
    console.log(`💭  Starting ${appName} in ${appEnv} mode...`.bold);
  }

  // let's try setting up the servers with user-supplied params
  if (!app.get('params').httpsOnly) {
    httpServer = http.Server(app);
  }

  if (app.get('params').https) {
    httpsOptions = {
      requestCert: app.get('params').requestCert,
      rejectUnauthorized: app.get('params').rejectUnauthorized
    };
    ca = app.get('params').ca;
    passphrase = app.get('params').passphrase;

    if (app.get('params').keyPath) {
      if (app.get('params').pfx) {
        httpsOptions.pfx = fs.readFileSync(app.get('params').keyPath.pfx);
      }
      else {
        httpsOptions.key = fs.readFileSync(app.get('params').keyPath.key);
        httpsOptions.cert = fs.readFileSync(app.get('params').keyPath.cert);
      }
      if (passphrase) {
        httpsOptions.passphrase = passphrase;
      }
      if (ca) {
        // String or array
        if (typeof ca === 'string') {
          httpsOptions.ca = fs.readFileSync(ca);
        }
        else if (ca instanceof Array) {
          httpsOptions.ca = [];
          ca.forEach(function(val, index, array) {
            httpsOptions.ca.push(fs.readFileSync(val));
          });
        }
      }
    }
    httpsServer = https.Server(httpsOptions, app);
  }

  app.httpServer = httpServer;
  app.httpsServer = httpsServer;

  // assign individual keys to connections when opened
  httpServer.on('connection', function(conn) {
    var key = conn.remoteAddress + ':' + conn.remotePort;
    connections[key] = conn;

    // once the connection closes, remove
    conn.on('close', function () {
      delete connections[key];
    });
  });

  // enable gzip compression
  app.use(require('compression')());

  // enable cookie parsing
  app.use(require('cookie-parser')());

  // enable favicon support
  if (app.get('params').favicon !== 'none') {
    app.use(require('serve-favicon')(app.get('appDir') + app.get('params').staticsRoot + app.get('params').favicon));
  }


  // bind user-defined middleware which fires at the beginning of each request if supplied
  if (params.onReqStart && typeof params.onReqStart === 'function') {
    app.use(params.onReqStart);
  }

  // configure express
  app = require('./lib/setExpressConfigs')(app);

  // fire user-defined onServerInit event
  if (params.onServerInit && typeof params.onServerInit === 'function') {
    params.onServerInit(app);
  }

  // Initialize Roosevelt app middleware and prepare static css,js
  function initServer(cb) {
    if (initialized) {
      return cb();
    }
    initialized = true;

    preprocessCss();

    function preprocessCss() {
      require('./lib/preprocessCss')(app, bundleJs);
    }

    function bundleJs() {
      require('./lib/jsBundler')(app, compileJs);
    }

    function compileJs() {
      require('./lib/jsCompiler')(app, validateHTML);
    }

    function validateHTML() {
      require('./lib/htmlValidator')(app, mapRoutes);
    }

    require('./lib/htmlMinify')(app);

    function mapRoutes() {
      // map routes
      app = require('./lib/mapRoutes')(app);

      // custom error page
      app = require('./lib/500ErrorPage.js')(app);

      cb();
    }
  }

  function startHttpServer() {
    // determine number of CPUs to use
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
            console.warn(`⚠️  ${appName} warning: invalid value "${array[index + 1]}" supplied to -cores param.`.red);
            numCPUs = 1;
          }
        }
        return;
      }
    });

    // start server
    function gracefulShutdown() {
      var key;
      function exitLog() {
        if (!app.get('suppressLogs')) {
          console.log(`✔️  ${appName} successfully closed all connections and shut down gracefully.`.magenta);
        }
        process.exit();
      }

      app.set('roosevelt:state', 'disconnecting');
      if (!app.get('suppressLogs')) {
        console.log(`\n💭  ${appName} received kill signal, attempting to shut down gracefully.`.magenta);
      }
      servers[0].close(function() {
        if (servers.length > 1) {
          servers[1].close(exitLog);
        }
        else {
          exitLog();
        }
      });

      // destroy connections when server is killed
      for (key in connections) {
        connections[key].destroy();
      }

      setTimeout(function() {
        console.error(`💥  ${appName} could not close all connections in time; forcefully shutting down.`.red);
        process.exit(1);
      }, app.get('params').shutdownTimeout);
    }

    var lock = {},
        startupCallback = function(proto, port) {
          return function() {
            if (!app.get('suppressLogs')) {
              console.log(`🎧  ${appName} ${proto} server listening on port ${port} (${appEnv} mode)`.bold);
            }
            if (!Object.isFrozen(lock)) {
              Object.freeze(lock);
              // fire user-defined onServerStart event
              if (params.onServerStart && typeof params.onServerStart === 'function') {
                params.onServerStart(app);
              }
            }
          };
        };

    if (cluster.isMaster && numCPUs > 1) {
      for (i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      cluster.on('exit', function(worker, code, signal) {
        if (!app.get('suppressLogs')) {
          console.log(`⚰️  ${appName} thread ${worker.process.pid} died`.magenta);
        }
      });
    }
    else {
      if (!app.get('params').httpsOnly) {
        servers.push(httpServer.listen(app.get('port'), (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(' HTTP', app.get('port'))));
      }
      if (app.get('params').https) {
        servers.push(httpsServer.listen(app.get('params').httpsPort, (params.localhostOnly && appEnv !== 'development' ? 'localhost' : null), startupCallback(' HTTPS', app.get('params').httpsPort)));
      }
      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    }
  }

  function startServer() {
    if (!initialized) {
      return initServer(startHttpServer);
    }
    startHttpServer();
  }

  return {
    httpServer: httpServer,
    httpsServer: httpsServer,
    expressApp: app,
    initServer: initServer,
    startServer: startServer
  };
};
