// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')

const path = require('path')
const fileExists = require('./fileExists')
const checkParams = require('./checkParams')
const appModulePath = require('app-module-path')
const defaultConfig = require('./defaults/config')
const logger = require('./logger')()
let appDir = require('./getAppDir')
let pkg

module.exports = function (app) {
  let params = app.get('params')

  // determine if app has a package.json
  try {
    pkg = require(path.join(appDir, 'package.json'))

    if (!pkg.rooseveltConfig) {
      throw new Error('rooseveltConfig not found!')
    }
  } catch (e) {
    pkg = {}

    // default folder structure generation to false when it's not set in the constructor
    if (!params.generateFolderStructure) {
      logger.warn(`Roosevelt initialized and configured solely via constructor! (${e.toString().includes('rooseveltConfig') ? 'No rooseveltConfig found in package.json' : 'No package.json found'})`.bold.yellow)
      logger.warn(`No files will be auto-generated unless you set param "generateFolderStructure" to true in the constructor as well. Only do that if you're sure you want Roosevelt to generate files in ${appDir}!`.bold.yellow)
      params.generateFolderStructure = false
    }
  }

  pkg.rooseveltConfig = pkg.rooseveltConfig || {}

  if (params.appDir || pkg.rooseveltConfig.appDir) {
    appDir = params.appDir || pkg.rooseveltConfig.appDir
  }

  app.set('appDir', appDir)
  app.set('package', pkg)
  app.set('appName', pkg.name || 'Roosevelt Express')
  app.set('appVersion', pkg.version)

  params.suppressLogs = checkParams(params.suppressLogs, pkg.rooseveltConfig.suppressLogs, defaultConfig.suppressLogs)

  params.publicFolder = checkParams(params.publicFolder, pkg.rooseveltConfig.publicFolder, defaultConfig.publicFolder)
  app.set('publicFolder', path.join(appDir, params.publicFolder))

  // use existence of public folder to determine first run
  if (!fileExists(path.join(appDir, params.publicFolder)) && !params.suppressLogs.rooseveltLogs) {
    // run the param audit
    require('./configAuditor')
  }

  // source remaining params from params argument, then package.json, then defaults

  params = {

    // behavior
    port: checkParams(process.env.HTTP_PORT, process.env.NODE_PORT, params.port, pkg.rooseveltConfig.port, defaultConfig.port),
    localhostOnly: checkParams(params.localhostOnly, pkg.rooseveltConfig.localhostOnly, defaultConfig.localhostOnly),
    suppressLogs: params.suppressLogs,
    noMinify: checkParams(params.noMinify, pkg.rooseveltConfig.noMinify, defaultConfig.noMinify),
    enableValidator: checkParams(params.enableValidator, pkg.rooseveltConfig.enableValidator, defaultConfig.enableValidator),
    validatorExceptions: checkParams(params.validatorExceptions, pkg.rooseveltConfig.validatorExceptions, defaultConfig.validatorExceptions),
    htmlValidator: checkParams(params.htmlValidator, pkg.rooseveltConfig.htmlValidator, defaultConfig.htmlValidator),
    multipart: checkParams(params.multipart, pkg.rooseveltConfig.multipart, defaultConfig.multipart),
    maxLagPerRequest: checkParams(params.maxLagPerRequest, pkg.rooseveltConfig.maxLagPerRequest, defaultConfig.maxLagPerRequest),
    shutdownTimeout: checkParams(params.shutdownTimeout, pkg.rooseveltConfig.shutdownTimeout, defaultConfig.shutdownTimeout),
    bodyParserUrlencodedParams: checkParams(params.bodyParserUrlencodedParams, pkg.rooseveltConfig.bodyParserUrlencodedParams, defaultConfig.bodyParserUrlencodedParams),
    bodyParserJsonParams: checkParams(params.bodyParserJsonParams, pkg.rooseveltConfig.bodyParserJsonParams, defaultConfig.bodyParserJsonParams),
    nodeEnv: checkParams(params.nodeEnv, pkg.rooseveltConfig.nodeEnv, process.env.NODE_ENV, defaultConfig.nodeEnv),
    generateFolderStructure: checkParams(params.generateFolderStructure, pkg.rooseveltConfig.generateFolderStructure, defaultConfig.generateFolderStructure),

    // https behavior - generally no defaults, user-defined
    https: checkParams(params.https, pkg.rooseveltConfig.https, defaultConfig.https),
    httpsOnly: checkParams(params.httpsOnly, pkg.rooseveltConfig.httpsOnly, defaultConfig.httpsOnly),
    httpsPort: checkParams(process.env.HTTPS_PORT, params.httpsPort, pkg.rooseveltConfig.httpsPort, defaultConfig.httpsPort),
    pfx: checkParams(params.pfx, pkg.rooseveltConfig.pfx, defaultConfig.pfx),
    keyPath: checkParams(params.keyPath, pkg.rooseveltConfig.keyPath, defaultConfig.keyPath), // object with pfx / key+cert (file paths)
    passphrase: checkParams(params.passphrase, pkg.rooseveltConfig.passphrase, defaultConfig.passphrase), // string
    ca: checkParams(params.ca, pkg.rooseveltConfig.ca, defaultConfig.ca), // string or array of strings (file paths)
    cafile: checkParams(params.cafile, pkg.rooseveltConfig.cafile, defaultConfig.cafile), // is ca a file
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
    staticsRoot: checkParams(params.staticsRoot, pkg.rooseveltConfig.staticsRoot, defaultConfig.staticsRoot),
    htmlMinify: checkParams(params.htmlMinify, pkg.rooseveltConfig.htmlMinify, defaultConfig.htmlMinify),
    cssPath: checkParams(params.cssPath, pkg.rooseveltConfig.cssPath, defaultConfig.cssPath),
    cssCompiler: checkParams(params.cssCompiler, pkg.rooseveltConfig.cssCompiler, defaultConfig.cssCompiler),
    cssCompilerWhitelist: checkParams(params.cssCompilerWhitelist, pkg.rooseveltConfig.cssCompilerWhitelist, defaultConfig.cssCompilerWhitelist),
    cssCompiledOutput: checkParams(params.cssCompiledOutput, pkg.rooseveltConfig.cssCompiledOutput, defaultConfig.cssCompiledOutput),
    jsPath: checkParams(params.jsPath, pkg.rooseveltConfig.jsPath, defaultConfig.jsPath),
    browserifyBundles: checkParams(params.browserifyBundles, pkg.rooseveltConfig.browserifyBundles, defaultConfig.browserifyBundles),
    bundledJsPath: checkParams(params.bundledJsPath, pkg.rooseveltConfig.bundledJsPath, defaultConfig.bundledJsPath),
    exposeBundles: checkParams(params.exposeBundles, pkg.rooseveltConfig.exposeBundles, defaultConfig.exposeBundles),
    jsCompiler: checkParams(params.jsCompiler, pkg.rooseveltConfig.jsCompiler, defaultConfig.jsCompiler),
    jsCompilerWhitelist: checkParams(params.jsCompilerWhitelist, pkg.rooseveltConfig.jsCompilerWhitelist, defaultConfig.jsCompilerWhitelist),
    jsCompiledOutput: checkParams(params.jsCompiledOutput, pkg.rooseveltConfig.jsCompiledOutput, defaultConfig.jsCompiledOutput),

    // public
    publicFolder: params.publicFolder,
    favicon: checkParams(params.favicon, pkg.rooseveltConfig.favicon, defaultConfig.favicon),
    symlinksToStatics: checkParams(params.symlinksToStatics, pkg.rooseveltConfig.symlinksToStatics, defaultConfig.symlinksToStatics),
    versionedStatics: checkParams(params.versionedStatics, pkg.rooseveltConfig.versionedStatics, defaultConfig.versionedStatics),
    versionedCssFile: checkParams(params.versionedCssFile, pkg.rooseveltConfig.versionedCssFile, defaultConfig.versionedCssFile),
    alwaysHostPublic: checkParams(params.alwaysHostPublic, pkg.rooseveltConfig.alwaysHostPublic, defaultConfig.alwaysHostPublic),

    // events
    onServerInit: params.onServerInit || undefined,
    onServerStart: params.onServerStart || undefined,
    onReqStart: params.onReqStart || undefined,
    onReqBeforeRoute: params.onReqBeforeRoute || undefined,
    onReqAfterRoute: params.onReqAfterRoute || undefined
  }

  // sets nodeEnv params
  if (params.nodeEnv !== undefined) {
    if (params.nodeEnv === 'development') {
      process.env.NODE_ENV = 'development'
    } else if (params.nodeEnv === 'production') {
      process.env.NODE_ENV = 'production'
      params.alwaysHostPublic = true // only with -prod flag, not when NODE_ENV is naturally set to production
    }
  }

  // map mvc paths
  app.set('modelsPath', path.join(appDir, params.modelsPath))
  app.set('viewsPath', path.join(appDir, params.viewsPath))
  app.set('controllersPath', path.join(appDir, params.controllersPath))

  // map statics paths
  app.set('staticsRoot', path.normalize(params.staticsRoot))
  params.cssPath = path.join(params.staticsRoot, params.cssPath)
  params.jsPath = path.join(params.staticsRoot, params.jsPath)
  params.cssCompiledOutput = path.join(params.staticsRoot, params.cssCompiledOutput)
  params.jsCompiledOutput = path.join(params.staticsRoot, params.jsCompiledOutput)
  params.bundledJsPath = path.join(params.jsPath, params.bundledJsPath)
  app.set('cssPath', path.join(appDir, params.cssPath))
  app.set('jsPath', path.join(appDir, params.jsPath))
  app.set('cssCompiledOutput', path.join(appDir, params.cssCompiledOutput))
  app.set('jsCompiledOutput', path.join(appDir, params.jsCompiledOutput))

  // determine statics prefix if any
  params.staticsPrefix = params.versionedStatics ? pkg.version || '' : ''

  // ensure 404 page exists
  params.error404 = path.join(app.get('controllersPath'), params.error404)
  if (!fileExists(params.error404)) {
    params.error404 = path.join(__dirname, '../defaultErrorPages/controllers/404.js')
  }

  // ensure 500 page exists
  params.error5xx = path.join(app.get('controllersPath'), params.error5xx)
  if (!fileExists(params.error5xx)) {
    params.error5xx = path.join(__dirname, '../defaultErrorPages/controllers/5xx.js')
  }

  // ensure 503 page exists
  params.error503 = path.join(app.get('controllersPath'), params.error503)
  if (!fileExists(params.error503)) {
    params.error503 = path.join(__dirname, '../defaultErrorPages/controllers/503.js')
  }

  // ensure formidableSettings is an object
  if (params.multipart !== false && typeof params.multipart !== 'object') {
    params.multipart = {}
  }

  // make the app directory requirable
  appModulePath.addPath(appDir)

  // make the models directory requirable
  appModulePath.addPath(path.join(appDir, params.modelsPath, '../'))

  // make the controllers directory requirable
  appModulePath.addPath(path.join(appDir, params.controllersPath, '../'))

  if (process.env.NODE_ENV === 'development') {
    params.noMinify = true
  }

  // force enable/disable validator
  process.argv.forEach(function (val, index, array) {
    switch (val) {
      case 'disable-validator':
        params.enableValidator = false
        break
      case 'enable-validator':
        params.enableValidator = true
        break
    }
  })

  // always disabled in prod mode
  if (process.env.NODE_ENV === 'production') {
    params.enableValidator = false
  }

  app.set('params', params)

  return app
}
