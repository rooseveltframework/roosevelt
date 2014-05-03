// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app
'use strict';

var fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json');
pkg.rooseveltConfig = pkg.rooseveltConfig || {};

module.exports = function(app) {
  var params = app.get('params'),
      modelsFolder,
      linkTarget;

  app.set('appDir', appDir);
  app.set('package', pkg);
  app.set('appName', pkg.name || 'Roosevelt Express');
  app.set('appVersion', pkg.version);

  // define staticsRoot before other params because other params depend on it
  params.staticsRoot = params.staticsRoot || pkg.rooseveltConfig.staticsRoot || 'statics/';
  app.set('staticsRoot', path.normalize(params.staticsRoot || pkg.rooseveltConfig.staticsRoot));

  // source remaining params from params argument, then package.json, then defaults
  params = {

    // behavior
    port: process.env.NODE_PORT || params.port || pkg.rooseveltConfig.port || 43711,
    localhostOnly: params.localhostOnly || pkg.rooseveltConfig.localhostOnly || true,
    disableLogger: params.disableLogger || pkg.rooseveltConfig.disableLogger || false,
    multipart: params.multipart || pkg.rooseveltConfig.multipart || {'multiples': true},
    maxLagPerRequest: params.maxLagPerRequest || pkg.maxLagPerRequest || 70,
    shutdownTimeout: params.shutdownTimeout || pkg.shutdownTimeout || 30000,

    // mvc
    modelsPath: params.modelsPath || pkg.rooseveltConfig.modelsPath || 'mvc/models',
    modelsNodeModulesSymlink: params.modelsNodeModulesSymlink || pkg.rooseveltConfig.modelsNodeModulesSymlink || 'models',
    viewsPath: params.viewsPath || pkg.rooseveltConfig.viewsPath || 'mvc/views',
    viewEngine: params.viewEngine || pkg.rooseveltConfig.viewEngine || 'html: teddy',
    controllersPath: params.controllersPath || pkg.rooseveltConfig.controllersPath || 'mvc/controllers',

    // error pages
    error404: params.error404 || pkg.rooseveltConfig.error404 || '404.js',
    error5xx: params.error5xx || pkg.rooseveltConfig.error5xx || '5xx.js',
    error503: params.error503 || pkg.rooseveltConfig.error503 || '503.js',

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    cssPath: params.staticsRoot + (params.cssPath || pkg.rooseveltConfig.cssPath || 'css'),
    cssCompiler: params.cssCompiler || pkg.rooseveltConfig.cssCompiler || {nodeModule: 'roosevelt-less', params: {compress: true}},
    cssCompiledOutput: params.staticsRoot + (params.cssCompiledOutput || pkg.rooseveltConfig.cssCompiledOutput || '.build/css'),
    cssCompilerWhitelist: params.cssCompilerWhitelist || pkg.rooseveltConfig.cssCompilerWhitelist || undefined,
    jsPath: params.staticsRoot + (params.jsPath || pkg.rooseveltConfig.jsPath || 'js'),
    jsCompiler: params.jsCompiler || pkg.rooseveltConfig.jsCompiler || {nodeModule: 'roosevelt-closure', params: {compilation_level: 'ADVANCED_OPTIMIZATIONS'}},
    jsCompiledOutput: params.staticsRoot + (params.jsCompiledOutput || pkg.rooseveltConfig.jsCompiledOutput || '.build/js'),
    jsCompilerWhitelist: params.jsCompilerWhitelist || pkg.rooseveltConfig.jsCompilerWhitelist || undefined,

    // public
    publicFolder: params.publicFolder || pkg.rooseveltConfig.publicFolder || 'public',
    symlinksToStatics: params.symlinksToStatics || pkg.rooseveltConfig.symlinksToStatics || ['css: .build/css', 'images', 'js: .build/js'],
    versionedStatics: params.versionedStatics || pkg.rooseveltConfig.versionedStatics || false,
    versionedCssFile: params.versionedCssFile || pkg.rooseveltConfig.versionedCssFile || undefined,
    alwaysHostPublic: params.alwaysHostPublic || pkg.rooseveltConfig.alwaysHostPublic || false,

    // events
    onServerInit: params.onServerInit || undefined,
    onServerStart: params.onServerStart || undefined,
    onReqStart: params.onReqStart || undefined,
    onReqBeforeRoute: params.onReqBeforeRoute || undefined,
    onReqAfterRoute: params.onReqAfterRoute || undefined
  };

  // postprocess params

  // explicit falseness check for modelsNodeModulesSymlink
  if (params.modelsNodeModulesSymlink === false || pkg.rooseveltConfig.modelsNodeModulesSymlink === false) {
    params.modelsNodeModulesSymlink = false;
  }

  // add trailing slashes where necessary
  ['modelsPath', 'viewsPath', 'controllersPath', 'staticsRoot', 'publicFolder', 'cssPath', 'jsPath', 'cssCompiledOutput', 'jsCompiledOutput'].forEach(function(i) {
    var path = params[i],
        finalChar = path.charAt(path.length - 1);
    params[i] = (finalChar !== '/' && finalChar !== '\\') ? path + '/' : path;
  });

  // map mvc paths
  app.set('modelsPath', path.normalize(appDir + params.modelsPath));
  app.set('viewsPath', path.normalize(appDir + params.viewsPath));
  app.set('controllersPath', path.normalize(appDir + params.controllersPath));

  // map statics paths
  app.set('publicFolder', path.normalize(appDir + params.publicFolder));
  app.set('cssPath', path.normalize(appDir + params.cssPath));
  app.set('jsPath', path.normalize(appDir + params.jsPath));
  app.set('cssCompiledOutput', path.normalize(appDir + params.cssCompiledOutput));
  app.set('jsCompiledOutput', path.normalize(appDir + params.jsCompiledOutput));

  // determine statics prefix if any
  params.staticsPrefix = params.versionedStatics ? pkg.version || '' : '';

  // ensure 404 page exists
  params.error404 = app.get('controllersPath') + params.error404;
  if (!fs.existsSync(params.error404)) {
    params.error404 = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/404.js';
  }

  // ensure 500 page exists
  params.error5xx = app.get('controllersPath') + params.error5xx;
  if (!fs.existsSync(params.error5xx)) {
    params.error5xx = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/5xx.js';
  }

  // ensure 503 page exists
  params.error503 = app.get('controllersPath') + params.error503;
  if (!fs.existsSync(params.error503)) {
    params.error503 = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/503.js';
  }

  // ensure formidableSettings is an object
  if (params.multipart !== false && typeof params.multipart !== 'object') {
    params.multipart = {};
  }

  // make symlink from node_modules to models dir
  if (params.modelsNodeModulesSymlink) {
    modelsFolder = appDir + params.modelsPath;
    linkTarget = appDir + 'node_modules/' + params.modelsNodeModulesSymlink;
    if (!fs.existsSync(linkTarget) || !fs.lstatSync(linkTarget) || !fs.lstatSync(linkTarget).isSymbolicLink()) {
      fs.symlinkSync(modelsFolder, linkTarget, 'junction');
      console.log(((app.get('appName') || 'Roosevelt') + ' making new symlink ').cyan + (linkTarget.replace(app.get('appDir'), '')).yellow + (' pointing to ').cyan + (modelsFolder.replace(app.get('appDir'), '')).yellow);
    }
  }

  app.set('params', params);

  return app;
};