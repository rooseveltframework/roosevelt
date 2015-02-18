// map routes
'use strict';

var fs = require('fs'),
    path = require('path'),
    wrench = require('wrench'),
    //toobusy = require('toobusy'), // disabled because https://github.com/lloyd/node-toobusy/issues/45
    colors = require('colors'),
    os = require('os');

module.exports = function(app) {
  var params = app.get('params'),
      express = app.get('express'),
      appDir = app.get('appDir'),
      controllerFiles,
      publicDir,
      ec = 0;

  // define maximum number of miliseconds to wait for a given request to finish
  //toobusy.maxLag(params.maxLagPerRequest);

  // serve 503 page if the process is too busy
  /*
  app.use(function(req, res, next) {
    if (toobusy()) {
      require(params.error503)(app, req, res);
    }
    else {
      next();
    }
  });*/

  // bind user-defined middleware which fires just before executing the controller if supplied
  if (params.onReqBeforeRoute && typeof params.onReqBeforeRoute === 'function') {
    app.use(params.onReqBeforeRoute);
  }

  // enable multipart
  if (typeof params.multipart === 'object') {
    app = require('./enableMultipart.js')(app);
  }

  // bind user-defined middleware which fires after request ends if supplied
  if (params.onReqAfterRoute && typeof params.onReqAfterRoute === 'function') {
    app.use(function(req, res, next) {
      var afterEnd = function() {
        params.onReqAfterRoute(req, res);
      };
      res.once('finish', afterEnd);
      res.once('close', afterEnd);
      res.once('error', afterEnd);
      next();
    });
  }

  // get public folder up and running
  publicDir = path.normalize(params.publicFolder);

  // make public folder itself if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    wrench.mkdirSyncRecursive(publicDir);
    console.log(((app.get('appName') || 'Roosevelt') + ' making new directory ' + publicDir.replace(app.get('appDir'), '')).yellow);
  }

  // make statics prefix folder if the setting is enabled
  if (params.staticsPrefix) {
    publicDir += path.normalize(params.staticsPrefix + '/');
    if (!fs.existsSync(publicDir)) {
      wrench.mkdirSyncRecursive(publicDir);
      console.log(((app.get('appName') || 'Roosevelt') + ' making new directory ' + publicDir.replace(app.get('appDir'), '')).yellow);
    }
  }

  // make symlinks to public statics
  params.symlinksToStatics.forEach(function(pubStatic) {
    pubStatic = pubStatic.split(':');
    var staticTarget = (appDir + params.staticsRoot + (pubStatic[1] || pubStatic[0]).trim()),
        linkTarget = (appDir + publicDir + pubStatic[0].trim());

    // make static target folder if it hasn't yet been created
    if (!fs.existsSync(staticTarget)) {
      wrench.mkdirSyncRecursive(staticTarget);
      console.log(((app.get('appName') || 'Roosevelt') + ' making new directory ' + staticTarget.replace(app.get('appDir'), '')).yellow);
    }

    // make symlink if it doesn't yet exist
    fs.readlink(linkTarget, function(err, target) {
      if (err) {
        fs.symlinkSync(staticTarget, linkTarget, 'junction');
        console.log(((app.get('appName') || 'Roosevelt') + ' making new symlink ').cyan + (linkTarget.replace(app.get('appDir'), '')).yellow + (' pointing to ').cyan + (staticTarget.replace(app.get('appDir'), '')).yellow);
      }
    });
  });

  // map statics for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    app.use('/', express.static(app.get('publicFolder')));
  }

  // build list of controller files
  try {
    controllerFiles = wrench.readdirSyncRecursive(app.get('controllersPath'));
  }
  catch (e) {
    console.error(((app.get('appName') || 'Roosevelt') + ' fatal error: could not load controller files from ' + app.get('controllersPath')).red);
    console.error(e);
  }

  // load all controllers
  controllerFiles.forEach(function(controllerName) {
    var error404 = os.platform() !== 'win32' ? controllerName.indexOf(params.error404.split('/').pop()) : controllerName.indexOf(params.error404.split('\\').pop());

    if (error404 < 0) {
      try {
        if (fs.statSync(app.get('controllersPath') + controllerName).isFile()) {
          require(app.get('controllersPath') + controllerName)(app);
        }
      }
      catch (e) {
        if (!ec) {
          console.error(('The night is dark and full of errors!').red.bold);
          ec++;
        }
        console.error(((app.get('appName') || 'Roosevelt') + ' failed to load controller file: ' + controllerName + '. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.').red);
        console.error(e);
      }
    }
  });

  // load 404 controller last so that it doesn't supersede the others
  try {
    require(params.error404)(app);
  }
  catch (e) {
    console.error(((app.get('appName') || 'Roosevelt') + ' failed to load 404 controller file: ' + params.error404 + '. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.').red);
    console.error(e);
  }

  return app;
};