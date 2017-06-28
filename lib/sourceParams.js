// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors');

var path = require('path'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json'),
    checkFiles = require('./checkFiles'),
    appModulePath = require('app-module-path'),
    defaultConfig = require('./defaultConfig');

pkg.rooseveltConfig = pkg.rooseveltConfig || {};

module.exports = function(app) {
  var params = app.get('params');

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
    port: process.env.HTTP_PORT || process.env.NODE_PORT || params.port || pkg.rooseveltConfig.port || defaultConfig.port,
    localhostOnly: params.localhostOnly !== undefined ? params.localhostOnly : pkg.rooseveltConfig.localhostOnly !== undefined ? pkg.rooseveltConfig.localhostOnly : defaultConfig.localhostOnly, // defaults to true so needs to be set below
    disableLogger: params.disableLogger !== undefined ? params.disableLogger : pkg.rooseveltConfig.disableLogger !== undefined ? pkg.rooseveltConfig.disableLogger : defaultConfig.disableLogger,
    noMinify: params.noMinify !== undefined ? params.noMinify : pkg.rooseveltConfig.noMinify !== undefined ? pkg.rooseveltConfig.noMinify : defaultConfig.noMinify,
    enableValidator: params.enableValidator !== undefined ? params.enableValidator : pkg.rooseveltConfig.enableValidator !== undefined ? pkg.rooseveltConfig.enableValidator : defaultConfig.enableValidator,
    htmlValidator: params.htmlValidator || pkg.rooseveltConfig.htmlValidator || defaultConfig.htmlValidator,
    validatorExceptions: params.validatorExceptions || pkg.rooseveltConfig.validatorExceptions || defaultConfig.validatorExceptions,
    multipart: params.multipart || pkg.rooseveltConfig.multipart || defaultConfig.multipart,
    maxLagPerRequest: params.maxLagPerRequest || pkg.maxLagPerRequest || defaultConfig.maxLagPerRequest,
    shutdownTimeout: params.shutdownTimeout || pkg.shutdownTimeout || defaultConfig.shutdownTimeout,
    bodyParserUrlencodedParams: params.bodyParserUrlencodedParams || pkg.rooseveltConfig.bodyParserUrlencodedParams || defaultConfig.bodyParserUrlencodedParams,
    bodyParserJsonParams: params.bodyParserJsonParams || pkg.rooseveltConfig.bodyParserJsonParams || defaultConfig.bodyParserJsonParams,
    nodeEnv: params.nodeEnv || pkg.rooseveltConfig.nodeEnv || process.env.NODE_ENV,

    // https behavior - generally no defaults, user-defined
    https: params.https !== undefined ? params.https : pkg.rooseveltConfig.https !== undefined ? pkg.rooseveltConfig.https : defaultConfig.https,
    httpsOnly: params.httpsOnly !== undefined ? params.httpsOnly : pkg.rooseveltConfig.httpsOnly !== undefined ? pkg.rooseveltConfig.httpsOnly : defaultConfig.httpsOnly,
    httpsPort: process.env.HTTPS_PORT || params.httpsPort || pkg.rooseveltConfig.httpsPort || defaultConfig.httpsPort,
    pfx: params.pfx !== undefined ? params.pfx : pkg.rooseveltConfig.pfx !== undefined ? pkg.rooseveltConfig.pfx : defaultConfig.pfx,
    keyPath: params.keyPath || pkg.rooseveltConfig.keyPath || defaultConfig.keyPath, // object with pfx / key+cert (file paths)
    passphrase: params.passphrase || pkg.rooseveltConfig.passphrase || defaultConfig.passphrase, // string
    ca: params.ca || pkg.rooseveltConfig.ca || defaultConfig.ca, // string or array of strings (file paths)
    requestCert: params.requestCert !== undefined ? params.requestCert : pkg.rooseveltConfig.requestCert !== undefined ? pks.rooseveltConfig.requestCert : defaultConfig.requestCert,
    rejectUnauthorized: params.rejectUnauthorized !== undefined ? params.rejectUnauthorized : pkg.rooseveltConfig.rejectUnauthorized !== undefined ? pkg.rooseveltConfig.rejectUnauthorized : defaultConfig.rejectUnauthorized,

    // mvc
    modelsPath: params.modelsPath || pkg.rooseveltConfig.modelsPath || defaultConfig.modelsPath,
    viewsPath: params.viewsPath || pkg.rooseveltConfig.viewsPath || defaultConfig.viewsPath,
    viewEngine: params.viewEngine || pkg.rooseveltConfig.viewEngine || defaultConfig.viewEngine,
    controllersPath: params.controllersPath || pkg.rooseveltConfig.controllersPath || defaultConfig.controllersPath,

    // error pages
    error404: params.error404 || pkg.rooseveltConfig.error404 || defaultConfig.error404,
    error5xx: params.error5xx || pkg.rooseveltConfig.error5xx || defaultConfig.error5xx,
    error503: params.error503 || pkg.rooseveltConfig.error503 || defaultConfig.error503,

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    htmlMinify: params.htmlMinify || pkg.rooseveltConfig.htmlMinify || defaultConfig.htmlMinify, /* eslint camelcase: 0 */
    cssPath: params.staticsRoot + (params.cssPath || pkg.rooseveltConfig.cssPath || defaultConfig.cssPath),
    cssCompiler: params.cssCompiler || pkg.rooseveltConfig.cssCompiler || defaultConfig.cssCompiler,
    cssCompiledOutput: params.staticsRoot + (params.cssCompiledOutput || pkg.rooseveltConfig.cssCompiledOutput || defaultConfig.cssCompiledOutput),
    cssCompilerWhitelist: params.cssCompilerWhitelist || pkg.rooseveltConfig.cssCompilerWhitelist || undefined,
    jsPath: params.staticsRoot + (params.jsPath || pkg.rooseveltConfig.jsPath || defaultConfig.jsPath),
    bundledJsPath: params.bundledJsPath || pkg.rooseveltConfig.bundledJsPath || defaultConfig.bundledJsPath,
    exposeBundles: params.exposeBundles !== undefined ? params.exposeBundles : pkg.rooseveltConfig.exposeBundles !== undefined ? pkg.rooseveltConfig.exposeBundles : defaultConfig.exposeBundles, // defaults to true so needs to be set below
    browserifyBundles: params.browserifyBundles || pkg.rooseveltConfig.browserifyBundles || defaultConfig.browserifyBundles,
    jsCompiler: params.jsCompiler || pkg.rooseveltConfig.jsCompiler || defaultConfig.jsCompiler,
    jsCompiledOutput: params.staticsRoot + (params.jsCompiledOutput || pkg.rooseveltConfig.jsCompiledOutput || defaultConfig.jsCompiledOutput),
    jsCompilerWhitelist: params.jsCompilerWhitelist || pkg.rooseveltConfig.jsCompilerWhitelist || undefined,

    // public
    publicFolder: params.publicFolder || pkg.rooseveltConfig.publicFolder || defaultConfig.publicFolder,
    favicon: params.favicon || pkg.rooseveltConfig.favicon || defaultConfig.favicon,
    symlinksToStatics: params.symlinksToStatics || pkg.rooseveltConfig.symlinksToStatics || defaultConfig.symlinksToStatics,
    versionedStatics: params.versionedStatics !== undefined ? params.versionedStatics : pkg.rooseveltConfig.versionedStatics !== undefined ? pkg.rooseveltConfig.versionedStatics : defaultConfig.versionedStatics,
    versionedCssFile: params.versionedCssFile || pkg.rooseveltConfig.versionedCssFile || undefined,
    alwaysHostPublic: params.alwaysHostPublic !== undefined ? params.alwaysHostPublic : pkg.rooseveltConfig.alwaysHostPublic !== undefined ? pkg.rooseveltConfig.alwaysHostPublic : defaultConfig.alwaysHostPublic,

    // events
    onServerInit: params.onServerInit || undefined,
    onServerStart: params.onServerStart || undefined,
    onReqStart: params.onReqStart || undefined,
    onReqBeforeRoute: params.onReqBeforeRoute || undefined,
    onReqAfterRoute: params.onReqAfterRoute || undefined
  };

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
