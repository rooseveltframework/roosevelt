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
    port: process.env.HTTP_PORT !== undefined ? process.env.HTTP_PORT : process.env.NODE_PORT !== undefined ? process.env.NODE_PORT : params.port !== undefined ? params.port : pkg.rooseveltConfig.port !== undefined ? pkg.rooseveltConfig.port : defaultConfig.port,
    localhostOnly: params.localhostOnly !== undefined ? params.localhostOnly : pkg.rooseveltConfig.localhostOnly !== undefined ? pkg.rooseveltConfig.localhostOnly : defaultConfig.localhostOnly, // defaults to true so needs to be set below
    disableLogger: params.disableLogger !== undefined ? params.disableLogger : pkg.rooseveltConfig.disableLogger !== undefined ? pkg.rooseveltConfig.disableLogger : defaultConfig.disableLogger,
    noMinify: params.noMinify !== undefined ? params.noMinify : pkg.rooseveltConfig.noMinify !== undefined ? pkg.rooseveltConfig.noMinify : defaultConfig.noMinify,
    enableValidator: params.enableValidator !== undefined ? params.enableValidator : pkg.rooseveltConfig.enableValidator !== undefined ? pkg.rooseveltConfig.enableValidator : defaultConfig.enableValidator,
    htmlValidator: params.htmlValidator !== undefined ? params.htmlValidator : pkg.rooseveltConfig.htmlValidator !== undefined ? pkg.rooseveltConfig.htmlValidator : defaultConfig.htmlValidator,
    validatorExceptions: params.validatorExceptions !== undefined ? params.validatorExceptions : pkg.rooseveltConfig.validatorExceptions !== undefined ? pkg.rooseveltConfig.validatorExceptions : defaultConfig.validatorExceptions,
    multipart: params.multipart !== undefined ? params.multipart : pkg.rooseveltConfig.multipart !== undefined ? pkg.rooseveltConfig.multipart : defaultConfig.multipart,
    maxLagPerRequest: params.maxLagPerRequest !== undefined ? params.maxLagPerRequest : pkg.maxLagPerRequest !== undefined ? pkg.maxLagPerRequest : defaultConfig.maxLagPerRequest,
    shutdownTimeout: params.shutdownTimeout !== undefined ? params.shutdownTimeout : pkg.shutdownTimeout !== undefined ? pkg.shutdownTimeout : defaultConfig.shutdownTimeout,
    bodyParserUrlencodedParams: params.bodyParserUrlencodedParams !== undefined ? params.bodyParserUrlencodedParams : pkg.rooseveltConfig.bodyParserUrlencodedParams !== undefined ? pkg.rooseveltConfig.bodyParserUrlencodedParams : defaultConfig.bodyParserUrlencodedParams,
    bodyParserJsonParams: params.bodyParserJsonParams !== undefined ? params.bodyParserJsonParams : pkg.rooseveltConfig.bodyParserJsonParams !== undefined ? pkg.rooseveltConfig.bodyParserJsonParams : defaultConfig.bodyParserJsonParams,
    nodeEnv: params.nodeEnv !== undefined ? params.nodeEnv : pkg.rooseveltConfig.nodeEnv !== undefined ? pkg.rooseveltConfig.nodeEnv : process.env.NODE_ENV,
    reload: params.reload !== undefined? params.reload : pkg.rooseveltConfig.reload !== undefined ? pkg.rooseveltConfig.reload : defaultConfig.reload,

    // https behavior - generally no defaults, user-defined
    https: params.https !== undefined ? params.https : pkg.rooseveltConfig.https !== undefined ? pkg.rooseveltConfig.https : defaultConfig.https,
    httpsOnly: params.httpsOnly !== undefined ? params.httpsOnly : pkg.rooseveltConfig.httpsOnly !== undefined ? pkg.rooseveltConfig.httpsOnly : defaultConfig.httpsOnly,
    httpsPort: process.env.HTTPS_PORT !== undefined ? process.env.HTTPS_PORT : params.httpsPort !== undefined ? params.httpsPort : pkg.rooseveltConfig.httpsPort !== undefined ? pkg.rooseveltConfig.httpsPort : defaultConfig.httpsPort,
    pfx: params.pfx !== undefined ? params.pfx : pkg.rooseveltConfig.pfx !== undefined ? pkg.rooseveltConfig.pfx : defaultConfig.pfx,
    keyPath: params.keyPath !== undefined ? params.keyPath : pkg.rooseveltConfig.keyPath !== undefined ? pkg.rooseveltConfig.keyPath : defaultConfig.keyPath, // object with pfx / key+cert (file paths)
    passphrase: params.passphrase !== undefined ? params.passphrase : pkg.rooseveltConfig.passphrase !== undefined ? pkg.rooseveltConfig.passphrase : defaultConfig.passphrase, // string
    ca: params.ca !== undefined ? params.ca : pkg.rooseveltConfig.ca !== undefined ? pkg.rooseveltConfig.ca : defaultConfig.ca, // string or array of strings (file paths)
    requestCert: params.requestCert !== undefined ? params.requestCert : pkg.rooseveltConfig.requestCert !== undefined ? pkg.rooseveltConfig.requestCert : defaultConfig.requestCert,
    rejectUnauthorized: params.rejectUnauthorized !== undefined ? params.rejectUnauthorized : pkg.rooseveltConfig.rejectUnauthorized !== undefined ? pkg.rooseveltConfig.rejectUnauthorized : defaultConfig.rejectUnauthorized,

    // mvc
    modelsPath: params.modelsPath !== undefined ? params.modelsPath : pkg.rooseveltConfig.modelsPath !== undefined ? pkg.rooseveltConfig.modelsPath : defaultConfig.modelsPath,
    viewsPath: params.viewsPath !== undefined ? params.viewsPath : pkg.rooseveltConfig.viewsPath !== undefined ? pkg.rooseveltConfig.viewsPath : defaultConfig.viewsPath,
    viewEngine: params.viewEngine !== undefined ? params.viewEngine : pkg.rooseveltConfig.viewEngine !== undefined ? pkg.rooseveltConfig.viewEngine : defaultConfig.viewEngine,
    controllersPath: params.controllersPath !== undefined ? params.controllersPath : pkg.rooseveltConfig.controllersPath !== undefined ? pkg.rooseveltConfig.controllersPath : defaultConfig.controllersPath,

    // error pages
    error404: params.error404 !== undefined ? params.error404 : pkg.rooseveltConfig.error404 !== undefined ? pkg.rooseveltConfig.error404 : defaultConfig.error404,
    error5xx: params.error5xx !== undefined ? params.error5xx : pkg.rooseveltConfig.error5xx !== undefined ? pkg.rooseveltConfig.error5xx : defaultConfig.error5xx,
    error503: params.error503 !== undefined ? params.error503 : pkg.rooseveltConfig.error503 !== undefined ? pkg.rooseveltConfig.error503 : defaultConfig.error503,

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    htmlMinify: params.htmlMinify !== undefined ? params.htmlMinify : pkg.rooseveltConfig.htmlMinify !== undefined ? pkg.rooseveltConfig.htmlMinify : defaultConfig.htmlMinify, /* eslint camelcase: 0 */
    cssPath: params.staticsRoot + (params.cssPath !== undefined ? params.cssPath : pkg.rooseveltConfig.cssPath !== undefined ? pkg.rooseveltConfig.cssPath : defaultConfig.cssPath),
    cssCompiler: params.cssCompiler !== undefined ? params.cssCompiler : pkg.rooseveltConfig.cssCompiler !== undefined ? pkg.rooseveltConfig.cssCompiler : defaultConfig.cssCompiler,
    cssCompiledOutput: params.staticsRoot + (params.cssCompiledOutput !== undefined ? params.cssCompiledOutput : pkg.rooseveltConfig.cssCompiledOutput !== undefined ? pkg.rooseveltConfig.cssCompiledOutput : defaultConfig.cssCompiledOutput),
    cssCompilerWhitelist: params.cssCompilerWhitelist !== undefined ? params.cssCompilerWhitelist : pkg.rooseveltConfig.cssCompilerWhitelist !== undefined ? pkg.rooseveltConfig.cssCompilerWhitelist : undefined,
    jsPath: params.staticsRoot + (params.jsPath !== undefined ? params.jsPath : pkg.rooseveltConfig.jsPath !== undefined ? pkg.rooseveltConfig.jsPath : defaultConfig.jsPath),
    bundledJsPath: params.bundledJsPath !== undefined ? params.bundledJsPath : pkg.rooseveltConfig.bundledJsPath !== undefined ? pkg.rooseveltConfig.bundledJsPath : defaultConfig.bundledJsPath,
    exposeBundles: params.exposeBundles !== undefined ? params.exposeBundles : pkg.rooseveltConfig.exposeBundles !== undefined ? pkg.rooseveltConfig.exposeBundles : defaultConfig.exposeBundles, // defaults to true so needs to be set below
    browserifyBundles: params.browserifyBundles !== undefined ? params.browserifyBundles : pkg.rooseveltConfig.browserifyBundles !== undefined ? pkg.rooseveltConfig.browserifyBundles : defaultConfig.browserifyBundles,
    jsCompiler: params.jsCompiler !== undefined ? params.jsCompiler : pkg.rooseveltConfig.jsCompiler !== undefined ? pkg.rooseveltConfig.jsCompiler : defaultConfig.jsCompiler,
    jsCompiledOutput: params.staticsRoot + (params.jsCompiledOutput !== undefined ? params.jsCompiledOutput : pkg.rooseveltConfig.jsCompiledOutput !== undefined ? pkg.rooseveltConfig.jsCompiledOutput : defaultConfig.jsCompiledOutput),
    jsCompilerWhitelist: params.jsCompilerWhitelist !== undefined ? params.jsCompilerWhitelist : pkg.rooseveltConfig.jsCompilerWhitelist !== undefined ? pkg.rooseveltConfig.jsCompilerWhitelist : undefined,

    // public
    publicFolder: params.publicFolder !== undefined ? params.publicFolder : pkg.rooseveltConfig.publicFolder !== undefined ? pkg.rooseveltConfig.publicFolder : defaultConfig.publicFolder,
    favicon: params.favicon !== undefined ? params.favicon : pkg.rooseveltConfig.favicon !== undefined ? pkg.rooseveltConfig.favicon : defaultConfig.favicon,
    symlinksToStatics: params.symlinksToStatics !== undefined ? params.symlinksToStatics : pkg.rooseveltConfig.symlinksToStatics !== undefined ? pkg.rooseveltConfig.symlinksToStatics : defaultConfig.symlinksToStatics,
    versionedStatics: params.versionedStatics !== undefined ? params.versionedStatics : pkg.rooseveltConfig.versionedStatics !== undefined ? pkg.rooseveltConfig.versionedStatics : defaultConfig.versionedStatics,
    versionedCssFile: params.versionedCssFile !== undefined ? params.versionedCssFile : pkg.rooseveltConfig.versionedCssFile !== undefined ? pkg.rooseveltConfig.versionedCssFile : undefined,
    alwaysHostPublic: params.alwaysHostPublic !== undefined ? params.alwaysHostPublic : pkg.rooseveltConfig.alwaysHostPublic !== undefined ? pkg.rooseveltConfig.alwaysHostPublic : defaultConfig.alwaysHostPublic,

    // events
    onServerInit: params.onServerInit !== undefined ? params.onServerInit : undefined,
    onServerStart: params.onServerStart !== undefined ? params.onServerStart : undefined,
    onReqStart: params.onReqStart !== undefined ? params.onReqStart : undefined,
    onReqBeforeRoute: params.onReqBeforeRoute !== undefined ? params.onReqBeforeRoute : undefined,
    onReqAfterRoute: params.onReqAfterRoute !== undefined ? params.onReqAfterRoute : undefined
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

  if (process.env.NODE_ENV === 'production' || process.env.ROOSEVELT_ENABLE_VALIDATOR === 'false') {
    params.enableValidator = false;
  }

  if (process.env.ROOSEVELT_ENABLE_VALIDATOR === 'true') {
    params.enableValidator = true;
  }

  app.set('params', params);

  return app;
};
