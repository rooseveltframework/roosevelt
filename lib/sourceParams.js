// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors');

var path = require('path'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json'),
    utils = require('./utils'),
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
    port: utils.checkParams(process.env.HTTP_PORT, process.env.NODE_PORT, params.port, pkg.rooseveltConfig.port, defaultConfig.port),
    localhostOnly: utils.checkParams(params.localhostOnly, pkg.rooseveltConfig.localhostOnly, defaultConfig.localhostOnly),
    disableLogger: utils.checkParams(params.disableLogger, pkg.rooseveltConfig.disableLogger, defaultConfig.disableLogger),
    noMinify: utils.checkParams(params.noMinify, pkg.rooseveltConfig.noMinify, defaultConfig.noMinify),
    enableValidator: utils.checkParams(params.enableValidator, pkg.rooseveltConfig.enableValidator, defaultConfig.enableValidator),
    htmlValidator: utils.checkParams(params.htmlValidator, pkg.rooseveltConfig.htmlValidator, defaultConfig.htmlValidator),
    validatorExceptions: utils.checkParams(params.validatorExceptions, pkg.rooseveltConfig.validatorExceptions, defaultConfig.validatorExceptions),
    multipart: utils.checkParams(params.multipart, pkg.rooseveltConfig.multipart, defaultConfig.multipart),
    maxLagPerRequest: utils.checkParams(params.maxLagPerRequest, pkg.rooseveltConfig.maxLagPerRequest, defaultConfig.maxLagPerRequest),
    shutdownTimeout: utils.checkParams(params.shutdownTimeout, pkg.rooseveltConfig.shutdownTimeout, defaultConfig.shutdownTimeout),
    bodyParserUrlencodedParams: utils.checkParams(params.bodyParserUrlencodedParams, pkg.rooseveltConfig.bodyParserUrlencodedParams, defaultConfig.bodyParserUrlencodedParams),
    bodyParserJsonParams: utils.checkParams(params.bodyParserJsonParams, pkg.rooseveltConfig.bodyParserJsonParams, defaultConfig.bodyParserJsonParams),
    nodeEnv: utils.checkParams(params.nodeEnv, pkg.rooseveltConfig.nodeEnv, process.env.NODE_ENV),
    reload: utils.checkParams(params.reload, pkg.rooseveltConfig.reload, defaultConfig.reload),

    // https behavior - generally no defaults, user-defined
    https: utils.checkParams(params.https, pkg.rooseveltConfig.https, defaultConfig.https),
    httpsOnly: utils.checkParams(params.httpsOnly, pkg.rooseveltConfig.httpsOnly, defaultConfig.httpsOnly),
    httpsPort: utils.checkParams(process.env.HTTPS_PORT, params.httpsPort, pkg.rooseveltConfig.httpsPort, defaultConfig.httpsPort),
    pfx: utils.checkParams(params.pfx, pkg.rooseveltConfig.pfx, defaultConfig.pfx),
    keyPath: utils.checkParams(params.keyPath, pkg.rooseveltConfig.keyPath, defaultConfig.keyPath), // object with pfx / key+cert (file paths)
    passphrase: utils.checkParams(params.passphrase, pkg.rooseveltConfig.passphrase, defaultConfig.passphrase), // string
    ca: utils.checkParams(params.ca, pkg.rooseveltConfig.ca, defaultConfig.ca), // string or array of strings (file paths)
    requestCert: utils.checkParams(params.requestCert, pkg.rooseveltConfig.requestCert, defaultConfig.requestCert),
    rejectUnauthorized: utils.checkParams(params.rejectUnauthorized, pkg.rooseveltConfig.rejectUnauthorized, defaultConfig.rejectUnauthorized),

    // mvc
    modelsPath: utils.checkParams(params.modelsPath, pkg.rooseveltConfig.modelsPath, defaultConfig.modelsPath),
    viewsPath: utils.checkParams(params.viewsPath, pkg.rooseveltConfig.viewsPath, defaultConfig.viewsPath),
    viewEngine: utils.checkParams(params.viewEngine, pkg.rooseveltConfig.viewEngine, defaultConfig.viewEngine),
    controllersPath: utils.checkParams(params.controllersPath, pkg.rooseveltConfig.controllersPath, defaultConfig.controllersPath),

    // error pages
    error404: utils.checkParams(params.error404, pkg.rooseveltConfig.error404, defaultConfig.error404),
    error5xx: utils.checkParams(params.error5xx, pkg.rooseveltConfig.error5xx, defaultConfig.error5xx),
    error503: utils.checkParams(params.error503, pkg.rooseveltConfig.error503, defaultConfig.error503),

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    htmlMinify: utils.checkParams(params.htmlMinify, pkg.rooseveltConfig.htmlMinify, defaultConfig.htmlMinify), /* eslint camelcase: 0 */
    cssPath: params.staticsRoot + (utils.checkParams(params.cssPath, pkg.rooseveltConfig.cssPath, defaultConfig.cssPath)),
    cssCompiler: utils.checkParams(params.cssCompiler, pkg.rooseveltConfig.cssCompiler, defaultConfig.cssCompiler),
    cssCompiledOutput: params.staticsRoot + (utils.checkParams(params.cssCompiledOutput, pkg.rooseveltConfig.cssCompiledOutput, defaultConfig.cssCompiledOutput)),
    cssCompilerWhitelist: utils.checkParams(params.cssCompilerWhitelist, pkg.rooseveltConfig.cssCompilerWhitelist, defaultConfig.cssCompilerWhitelist),
    jsPath: params.staticsRoot + (utils.checkParams(params.jsPath, pkg.rooseveltConfig.jsPath, defaultConfig.jsPath)),
    bundledJsPath: utils.checkParams(params.bundledJsPath, pkg.rooseveltConfig.bundledJsPath, defaultConfig.bundledJsPath),
    exposeBundles: utils.checkParams(params.exposeBundles, pkg.rooseveltConfig.exposeBundles, defaultConfig.exposeBundles),
    browserifyBundles: utils.checkParams(params.browserifyBundles, pkg.rooseveltConfig.browserifyBundles, defaultConfig.browserifyBundles),
    jsCompiler: utils.checkParams(params.jsCompiler, pkg.rooseveltConfig.jsCompiler, defaultConfig.jsCompiler),
    jsCompiledOutput: params.staticsRoot + (utils.checkParams(params.jsCompiledOutput, pkg.rooseveltConfig.jsCompiledOutput, defaultConfig.jsCompiledOutput)),
    jsCompilerWhitelist: utils.checkParams(params.jsCompilerWhitelist, pkg.rooseveltConfig.jsCompilerWhitelist, defaultConfig.jsCompilerWhitelist),

    // public
    publicFolder: utils.checkParams(params.publicFolder, pkg.rooseveltConfig.publicFolder, defaultConfig.publicFolder),
    favicon: utils.checkParams(params.favicon, pkg.rooseveltConfig.favicon, defaultConfig.favicon),
    symlinksToStatics: utils.checkParams(params.symlinksToStatics, pkg.rooseveltConfig.symlinksToStatics, defaultConfig.symlinksToStatics),
    versionedStatics: utils.checkParams(params.versionedStatics, pkg.rooseveltConfig.versionedStatics, defaultConfig.versionedStatics),
    versionedCssFile: utils.checkParams(params.versionedCssFile, pkg.rooseveltConfig.versionedCssFile, defaultConfig.versionedCssFile),
    alwaysHostPublic: utils.checkParams(params.alwaysHostPublic, pkg.rooseveltConfig.alwaysHostPublic, defaultConfig.alwaysHostPublic),

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
  if (!utils.fileExists(params.error404)) {
    params.error404 = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/404.js';
  }

  // ensure 500 page exists
  params.error5xx = app.get('controllersPath') + params.error5xx;
  if (!utils.fileExists(params.error5xx)) {
    params.error5xx = appDir + 'node_modules/roosevelt/defaultErrorPages/controllers/5xx.js';
  }

  // ensure 503 page exists
  params.error503 = app.get('controllersPath') + params.error503;
  if (!utils.fileExists(params.error503)) {
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

  // make the controllers directory requirable
  appModulePath.addPath(appDir + params.controllersPath + '../');

  if (process.env.NODE_ENV === 'development') {
    params.noMinify = true;
  }

  // force enable/disable validator
  process.argv.forEach(function(val, index, array) {
    switch (val) {
      case 'disable-validator':
        params.enableValidator = false;
        break;
      case 'enable-validator':
        params.enableValidator = true;
        break;
    }
  });

  // always disabled in prod mode
  if (process.env.NODE_ENV === 'production') {
    params.enableValidator = false;
  }

  app.set('params', params);

  return app;
};
