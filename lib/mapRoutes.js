// map routes

require('colors');

var fs = require('fs'),
    path = require('path'),
    fse = require('fs-extra'),
    klawSync = require('klaw-sync'),
    toobusy = require('toobusy-js'),
    utils = require('./utils');

module.exports = function(app) {
  var params = app.get('params'),
      express = app.get('express'),
      appDir = app.get('appDir'),
      appName = app.get('appName'),
      controllerFiles,
      publicDir,
      ec = 0;

  // define maximum number of miliseconds to wait for a given request to finish
  toobusy.maxLag(params.maxLagPerRequest);

  // serve 503 page if the process is too busy
  app.use(function(req, res, next) {
    if (toobusy()) {
      require(params.error503)(app, req, res);
    }
    else {
      next();
    }
  });

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
  publicDir = path.join(appDir, params.publicFolder);

  // make public folder itself if it doesn't exist
  if (!utils.fileExists(publicDir)) {
    fse.mkdirsSync(publicDir);
    if (!app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${publicDir}`.yellow);
    }
  }

  // make statics prefix folder if the setting is enabled
  if (params.staticsPrefix) {
    publicDir = path.join(publicDir, params.staticsPrefix);
    if (!utils.fileExists(publicDir)) {
      fse.mkdirsSync(publicDir);
      if (!app.get('suppressLogs')) {
        console.log(`📁  ${appName} making new directory ${publicDir}`.yellow);
      }
    }
  }

  // make symlinks to public statics
  params.symlinksToStatics.forEach(function(pubStatic) {
    pubStatic = pubStatic.split(':');
    var staticTarget = path.join(appDir, params.staticsRoot, (pubStatic[1] || pubStatic[0]).trim()),
        linkTarget = path.join(publicDir, pubStatic[0].trim());

    // make static target folder if it hasn't yet been created
    if (!utils.fileExists(staticTarget)) {
      fse.mkdirsSync(staticTarget);
      if (!app.get('suppressLogs')) {
        console.log(`📁  ${appName} making new directory ${staticTarget}`.yellow);
      }
    }

    // make symlink if it doesn't yet exist
    if (!utils.fileExists(linkTarget)) {
      if (utils.symlinkExists(linkTarget)) {
        fs.unlinkSync(linkTarget);
      }
      fs.symlinkSync(staticTarget, linkTarget);
      if (!app.get('suppressLogs')) {
        console.log(`📁  ${appName} making new symlink `.cyan + `${linkTarget}`.yellow + (' pointing to ').cyan + `${staticTarget}`.yellow);
      }
    }
  });

  // map statics for developer mode
  if (params.alwaysHostPublic || app.get('env') === 'development') {
    app.use('/', express.static(app.get('publicFolder')));
  }

  // build list of controller files
  try {
    controllerFiles = klawSync(path.normalize(app.get('controllersPath')));
  }
  catch (e) {
    console.error(`❌  ${appName} fatal error: could not load controller files from ${app.get('controllersPath')}`.red);
    console.error(e);
  }

  // load all controllers
  controllerFiles.forEach(function(controllerName) {
    var controller;
    controllerName = controllerName.path;

    if (controllerName !== params.error404) {
      try {
        if (fs.statSync(controllerName).isFile()) {
          controller = require(controllerName);

          // if the controller accepts more or less than one argument, it's not defining a route
          if (controller.length === 1) {
            controller(app);
          }
        }
      }
      catch (e) {
        if (!ec) {
          console.error('🔥  The night is dark and full of errors!'.red.bold);
          ec++;
        }
        console.error(`❌  ${appName} failed to load controller file: ${controllerName}. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.`.red);
        console.error(e);
      }
    }
  });

  // load 404 controller last so that it doesn't supersede the others
  try {
    require(params.error404)(app);
  }
  catch (e) {
    console.error(`❌  ${appName} failed to load 404 controller file: ${params.error404}. Please make sure it is coded correctly. See documentation at http://github.com/kethinov/roosevelt for examples.`.red);
    console.error(e);
  }

  return app;
};
