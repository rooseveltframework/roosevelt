// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors');

var path = require('path'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json'),
    checkFiles = require('./checkFiles'),
    appModulePath = require('app-module-path');
pkg.rooseveltConfig = pkg.rooseveltConfig || {};

module.exports = function(app) {
  var params = app.get('params');

  if (params.appDir || pkg.rooseveltConfig.appDir) {
    appDir = params.appDir || pkg.rooseveltConfig.appDir ;
  }

  app.set('appDir', appDir);
  app.set('package', pkg);
  app.set('appName', pkg.name || 'Roosevelt Express');
  app.set('appVersion', pkg.version);

  // define staticsRoot before other params because other params depend on it
  params.staticsRoot = params.staticsRoot || pkg.rooseveltConfig.staticsRoot || 'statics/';
  if (params.staticsRoot.charAt(params.staticsRoot.length - 1) !== '/' || params.staticsRoot.charAt(params.staticsRoot.length - 1) !== '\\') {
    params.staticsRoot += '/';
  }
  app.set('staticsRoot', path.normalize(params.staticsRoot || pkg.rooseveltConfig.staticsRoot));

  // source remaining params from params argument, then package.json, then defaults
  params = {

    // behavior
    port: process.env.HTTP_PORT || process.env.NODE_PORT || params.port || pkg.rooseveltConfig.port || 43711,
    localhostOnly: params.localhostOnly, // defaults to true so needs to be set below
    disableLogger: params.disableLogger || pkg.rooseveltConfig.disableLogger || false,
    noMinify: params.noMinify || pkg.rooseveltConfig.noMinify || false,
    enableValidator: params.enableValidator || pkg.rooseveltConfig.enableValidator || false,
    htmlValidator: params.htmlValidator || pkg.rooseveltConfig.htmlValidator || {port: '8888', format: 'text', suppressWarnings: false},
    validatorExceptions: params.validatorExceptions || pkg.rooseveltConfig.validatorExceptions || {requestHeader: 'Partial', modelValue: '_disableValidator'},
    multipart: params.multipart || pkg.rooseveltConfig.multipart || {'multiples': true},
    maxLagPerRequest: params.maxLagPerRequest || pkg.maxLagPerRequest || 70,
    shutdownTimeout: params.shutdownTimeout || pkg.shutdownTimeout || 30000,
    bodyParserUrlencodedParams: params.bodyParserUrlencodedParams || pkg.rooseveltConfig.bodyParserUrlencodedParams || { extended: true },
    bodyParserJsonParams: params.bodyParserJsonParams || pkg.rooseveltConfig.bodyParserJsonParams || {},
    nodeEnv: params.nodeEnv || pkg.rooseveltConfig.nodeEnv || process.env.NODE_ENV,

    // https behavior - generally no defaults, user-defined
    https: params.https || pkg.rooseveltConfig.https || false,
    httpsOnly: params.httpsOnly || pkg.rooseveltConfig.httpsOnly || false,
    httpsPort: process.env.HTTPS_PORT || params.httpsPort || pkg.rooseveltConfig.httpsPort || 43733,
    pfx: params.pfx || pkg.rooseveltConfig.pfx || false,
    keyPath: params.keyPath || pkg.rooseveltConfig.keyPath || null, // object with pfx / key+cert (file paths)
    passphrase: params.passphrase || pkg.rooseveltConfig.passphrase || null, // string
    ca: params.ca || pkg.rooseveltConfig.ca || null, // string or array of strings (file paths)
    requestCert: params.requestCert || pkg.rooseveltConfig.requestCert || false,
    rejectUnauthorized: params.rejectUnauthorized || pkg.rooseveltConfig.rejectUnauthorized || false,

    // mvc
    modelsPath: params.modelsPath || pkg.rooseveltConfig.modelsPath || 'mvc/models',
    viewsPath: params.viewsPath || pkg.rooseveltConfig.viewsPath || 'mvc/views',
    viewEngine: params.viewEngine || pkg.rooseveltConfig.viewEngine || 'html: teddy',
    controllersPath: params.controllersPath || pkg.rooseveltConfig.controllersPath || 'mvc/controllers',

    // error pages
    error404: params.error404 || pkg.rooseveltConfig.error404 || '404.js',
    error5xx: params.error5xx || pkg.rooseveltConfig.error5xx || '5xx.js',
    error503: params.error503 || pkg.rooseveltConfig.error503 || '503.js',

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    htmlMinify: params.htmlMinify || pkg.rooseveltConfig.htmlMinify || {override: true, exception_url: false, htmlMinifier: {html5: true}}, /* eslint camelcase: 0 */
    cssPath: params.staticsRoot + (params.cssPath || pkg.rooseveltConfig.cssPath || 'css'),
    cssCompiler: params.cssCompiler || pkg.rooseveltConfig.cssCompiler || {nodeModule: 'roosevelt-less', params: {compress: true}},
    cssCompiledOutput: params.staticsRoot + (params.cssCompiledOutput || pkg.rooseveltConfig.cssCompiledOutput || '.build/css'),
    cssCompilerWhitelist: params.cssCompilerWhitelist || pkg.rooseveltConfig.cssCompilerWhitelist || undefined,
    jsPath: params.staticsRoot + (params.jsPath || pkg.rooseveltConfig.jsPath || 'js'),
    bundledJsPath: params.bundledJsPath || pkg.rooseveltConfig.bundledJsPath || '.bundled',
    exposeBundles: params.exposeBundles, // defaults to true so needs to be set below
    browserifyBundles: params.browserifyBundles || pkg.rooseveltConfig.browserifyBundles || [],
    jsCompiler: params.jsCompiler || pkg.rooseveltConfig.jsCompiler || {nodeModule: 'roosevelt-closure', showWarnings: false, params: {compilationLevel: 'ADVANCED'}},
    jsCompiledOutput: params.staticsRoot + (params.jsCompiledOutput || pkg.rooseveltConfig.jsCompiledOutput || '.build/js'),
    jsCompilerWhitelist: params.jsCompilerWhitelist || pkg.rooseveltConfig.jsCompilerWhitelist || undefined,

    // public
    publicFolder: params.publicFolder || pkg.rooseveltConfig.publicFolder || 'public',
    favicon: params.favicon || pkg.rooseveltConfig.favicon || 'images/favicon.ico',
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

  // booleans which default to true
  if (params.localhostOnly !== undefined) {
    params.localhostOnly = params.localhostOnly;
  }
  else if (pkg.rooseveltConfig.localhostOnly !== undefined) {
    params.localhostOnly = pkg.rooseveltConfig.localhostOnly;
  }
  else {
    params.localhostOnly = true;
  }
  if (params.exposeBundles !== undefined) {
    params.exposeBundles = params.exposeBundles;
  }
  else if (pkg.rooseveltConfig.exposeBundles !== undefined) {
    params.exposeBundles = pkg.rooseveltConfig.exposeBundles;
  }
  else {
    params.exposeBundles = true;
  }

  // sets nodeEnv params
  if (params.nodeEnv !== undefined) {
    if (params.nodeEnv === 'development') {
      process.env.NODE_ENV = 'development';
    }
    else if (params.nodeEnv === 'production') {
      process.env.NODE_ENV = 'production';
      params.alwaysHostPublic = true; // only with -prod flag, not when NODE_ENV is naturally set to production
    }
  }

  // add trailing slashes where necessary
  ['modelsPath', 'viewsPath', 'controllersPath', 'staticsRoot', 'publicFolder', 'cssPath', 'jsPath', 'cssCompiledOutput', 'jsCompiledOutput'].forEach(function(i) {
    var path = params[i],
        finalChar = path.charAt(path.length - 1);
    params[i] = (finalChar !== '/' && finalChar !== '\\') ? path + '/' : path;
  });

  params.bundledJsPath = params.jsPath + params.bundledJsPath;

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
  if (!checkFiles.fileExists(params.error404)) {
    params.error404 = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/404.js';
  }

  // ensure 500 page exists
  params.error5xx = app.get('controllersPath') + params.error5xx;
  if (!checkFiles.fileExists(params.error5xx)) {
    params.error5xx = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/5xx.js';
  }

  // ensure 503 page exists
  params.error503 = app.get('controllersPath') + params.error503;
  if (!checkFiles.fileExists(params.error503)) {
    params.error503 = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/503.js';
  }

  // ensure formidableSettings is an object
  if (params.multipart !== false && typeof params.multipart !== 'object') {
    params.multipart = {};
  }

  // make the app directory requirable
  appModulePath.addPath(appDir);

  // make the models directory requirable
  appModulePath.addPath(appDir + params.modelsPath + '../');

  if (process.env.NODE_ENV === 'development') {
    params.noMinify = true;
  }

  if (process.env.NODE_ENV === 'production') {
    params.enableValidator = false;
  }

  app.set('params', params);

  return app;
};
