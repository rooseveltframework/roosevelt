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
    port: checkParams(process.env.HTTP_PORT, process.env.NODE_PORT, params.port, pkg.rooseveltConfig.port, defaultConfig.port),
    localhostOnly: checkParams(params.localhostOnly, pkg.rooseveltConfig.localhostOnly, defaultConfig.localhostOnly),
    disableLogger: checkParams(params.disableLogger, pkg.rooseveltConfig.disableLogger, defaultConfig.disableLogger),
    noMinify: checkParams(params.noMinify, pkg.rooseveltConfig.noMinify, defaultConfig.noMinify),
    enableValidator: checkParams(params.enableValidator, pkg.rooseveltConfig.enableValidator, defaultConfig.enableValidator),
    htmlValidator: checkParams(params.htmlValidator, pkg.rooseveltConfig.htmlValidator, defaultConfig.htmlValidator),
    validatorExceptions: checkParams(params.validatorExceptions, pkg.rooseveltConfig.validatorExceptions, defaultConfig.validatorExceptions),
    multipart: checkParams(params.multipart, pkg.rooseveltConfig.multipart, defaultConfig.multipart),
    maxLagPerRequest: checkParams(params.maxLagPerRequest, pkg.maxLagPerRequest, defaultConfig.maxLagPerRequest),
    shutdownTimeout: checkParams(params.shutdownTimeout, pkg.shutdownTimeout, defaultConfig.shutdownTimeout),
    bodyParserUrlencodedParams: checkParams(params.bodyParserUrlencodedParams, pkg.rooseveltConfig.bodyParserUrlencodedParams, defaultConfig.bodyParserUrlencodedParams),
    bodyParserJsonParams: checkParams(params.bodyParserJsonParams, pkg.rooseveltConfig.bodyParserJsonParams, defaultConfig.bodyParserJsonParams),
    nodeEnv: checkParams(params.nodeEnv, pkg.rooseveltConfig.nodeEnv, defaultConfig.nodeEnv, process.env.NODE_ENV),

    // https behavior - generally no defaults, user-defined
    https: checkParams(params.https, pkg.rooseveltConfig.https, defaultConfig.https),
    httpsOnly: checkParams(params.httpsOnly, pkg.rooseveltConfig.httpsOnly, defaultConfig.httpsOnly),
    httpsPort: checkParams(process.env.HTTPS_PORT, params.httpsPort, pkg.rooseveltConfig.httpsPort, defaultConfig.httpsPort),
    pfx: checkParams(params.pfx, pkg.rooseveltConfig.pfx, defaultConfig.pfx),
    keyPath: checkParams(params.keyPath, pkg.rooseveltConfig.keyPath, defaultConfig.keyPath), // object with pfx / key+cert (file paths)
    passphrase: checkParams(params.passphrase, pkg.rooseveltConfig.passphrase, defaultConfig.passphrase), // string
    ca: checkParams(params.ca, pkg.rooseveltConfig.ca, defaultConfig.ca), // string or array of strings (file paths)
    requestCert: checkParams(params.requestCert, pkg.rooseveltConfig.requestCert, defaultConfig.requestCert),
    rejectUnauthorized: checkParams(params.rejectUnauthorized, pkg.rooseveltConfig.rejectUnauthorized, defaultConfig.rejectUnauthorized),

    // mvc
    modelsPath: checkParams(params.modelsPath, pkg.rooseveltConfig.modelsPath, defaultConfig.modelsPath),
    viewsPath: checkParams(params.viewsPath, pkg.rooseveltConfig.viewsPath, defaultConfig.viewsPath),
    viewEngine: checkParams(params.viewEngine, pkg.rooseveltConfig.viewEngine, defaultConfig.viewEngine),
    controllersPath: checkParams(params.controllersPath, pkg.rooseveltConfig.controllersPath, defaultConfig.controllersPath),

    // error pages
    error404: checkParams(params.error404, pkg.rooseveltConfig.error404, defaultConfig.error404),
    error5xx: checkParams(params.error5xx, pkg.rooseveltConfig.error5xx, defaultConfig.error5xx),
    error503: checkParams(params.error503, pkg.rooseveltConfig.error503, defaultConfig.error503),

    // statics
    staticsRoot: params.staticsRoot, // default hierarchy defined above because below params depend on this one being predefined
    htmlMinify: checkParams(params.htmlMinify, pkg.rooseveltConfig.htmlMinify, defaultConfig.htmlMinify), /* eslint camelcase: 0 */
    cssPath: params.staticsRoot + (checkParams(params.cssPath, pkg.rooseveltConfig.cssPath, defaultConfig.cssPath)),
    cssCompiler: checkParams(params.cssCompiler, pkg.rooseveltConfig.cssCompiler, defaultConfig.cssCompiler),
    cssCompiledOutput: params.staticsRoot + (checkParams(params.cssCompiledOutput, pkg.rooseveltConfig.cssCompiledOutput, defaultConfig.cssCompiledOutput)),
    cssCompilerWhitelist: checkParams(params.cssCompilerWhitelist, pkg.rooseveltConfig.cssCompilerWhitelist, defaultConfig.cssCompilerWhitelist),
    jsPath: params.staticsRoot + (checkParams(params.jsPath, pkg.rooseveltConfig.jsPath, defaultConfig.jsPath)),
    bundledJsPath: checkParams(params.bundledJsPath, pkg.rooseveltConfig.bundledJsPath, defaultConfig.bundledJsPath),
    exposeBundles: checkParams(params.exposeBundles, pkg.rooseveltConfig.exposeBundles, defaultConfig.exposeBundles),
    browserifyBundles: checkParams(params.browserifyBundles, pkg.rooseveltConfig.browserifyBundles, defaultConfig.browserifyBundles),
    jsCompiler: checkParams(params.jsCompiler, pkg.rooseveltConfig.jsCompiler, defaultConfig.jsCompiler),
    jsCompiledOutput: params.staticsRoot + (checkParams(params.jsCompiledOutput, pkg.rooseveltConfig.jsCompiledOutput, defaultConfig.jsCompiledOutput)),
    jsCompilerWhitelist: checkParams(params.jsCompilerWhitelist, pkg.rooseveltConfig.jsCompilerWhitelist, defaultConfig.jsCompilerWhitelist),

    // public
    publicFolder: checkParams(params.publicFolder, pkg.rooseveltConfig.publicFolder, defaultConfig.publicFolder),
    favicon: checkParams(params.favicon, pkg.rooseveltConfig.favicon, defaultConfig.favicon),
    symlinksToStatics: checkParams(params.symlinksToStatics, pkg.rooseveltConfig.symlinksToStatics, defaultConfig.symlinksToStatics),
    versionedStatics: checkParams(params.versionedStatics, pkg.rooseveltConfig.versionedStatics, defaultConfig.versionedStatics),
    versionedCssFile: checkParams(params.versionedCssFile, pkg.rooseveltConfig.versionedCssFile, defaultConfig.versionedCssFile),
    alwaysHostPublic: checkParams(params.alwaysHostPublic, pkg.rooseveltConfig.alwaysHostPublic, defaultConfig.alwaysHostPublic),

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

  // make the controllers directory requirable
  appModulePath.addPath(appDir + params.controllersPath + '../');

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

  function checkObject(object1, object2) {
    var i,
        length = Object.keys(object2).length,
        missing = Object.keys(object1).length > length ? false : true;

    if (missing) {
      for (i = 0; i < length; i++) {
        if (!(Object.keys(object2)[i] in object1)) {
          object1[Object.keys(object2)[i]] = object2[Object.keys(object2)[i]];
        }
      }
    }
  }

  function checkParams() {
    var args = arguments,
        isObject = false,
        obj,
        value;

    if (args['2'] !== undefined && args['2'] instanceof Object) {
      isObject = true;
    }

    for (obj in args) {
      if (args[obj] !== undefined) {
        if (value !== undefined) {
          if (isObject) {
            checkObject(value, args[obj]);
          }
          else {
            return value;
          }
        }
        else {
          value = args[obj];
        }
      }
    }
    return value;
  }

  return app;
};
