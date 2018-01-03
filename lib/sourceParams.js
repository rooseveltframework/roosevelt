// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')

const path = require('path')
const checkParams = require('./tools/checkParams')
const appModulePath = require('app-module-path')
const defaultConfig = require('./defaults/config')
const fsr = require('./tools/fsr')()
const logger = require('./tools/logger')()
let pkg

module.exports = function (app) {
  let params = app.get('params')
  let flags = app.get('flags')
  let appDir = params.appDir

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
      logger.warn(`Roosevelt initialized and configured solely via constructor! (${e.toString().includes('rooseveltConfig') ? 'No rooseveltConfig found in package.json' : 'No package.json found'})`.yellow)
      logger.warn(`No files will be auto-generated unless you set param "generateFolderStructure" to true in the constructor as well. Only do that if you're sure you want Roosevelt to generate files in ${appDir}!`.yellow)
      params.generateFolderStructure = false
    }
  }

  pkg.rooseveltConfig = pkg.rooseveltConfig || {}

  // determine node env
  if (flags.productionMode) {
    params.nodeEnv = 'production'
  } else if (flags.developmentMode) {
    params.nodeEnv = 'development'
  } else {
    // default env to production
    process.env.NODE_ENV = 'production'
    params.nodeEnv = checkParams(params.nodeEnv, pkg.rooseveltConfig.nodeEnv, process.env.NODE_ENV, defaultConfig.nodeEnv)
  }

  // override NODE_ENV with nodeEnv param
  process.env.NODE_ENV = params.nodeEnv
  app.set('env', process.env.NODE_ENV)

  // give priority to params overridden by CLI/env
  params.htmlValidator = params.htmlValidator || {}
  if (flags.enableValidator) {
    params.htmlValidator.enable = true
  } else if (flags.disableValidator) {
    params.htmlValidator.enable = false
  }
  if (flags.backgroundValidator) {
    params.htmlValidator.separateProcess = true
  } else if (flags.attachValidator) {
    params.htmlValidator.separateProcess = false
  }
  if (flags.productionMode) {
    params.alwaysHostPublic = true
  }
  if (process.env.NODE_ENV === 'development') {
    params.noMinify = true
  } else if (process.env.NODE_ENV === 'production') {
    params.htmlValidator.enable = false
  }

  // reset htmlValidator param if no flags modify it
  if (!Object.keys(params.htmlValidator).length) {
    delete params.htmlValidator
  }

  app.set('appDir', appDir)
  app.set('package', pkg)
  app.set('appName', pkg.name || 'Roosevelt Express')
  app.set('appVersion', pkg.version)

  params.suppressLogs = checkParams(params.suppressLogs, pkg.rooseveltConfig.suppressLogs, defaultConfig.suppressLogs)

  params.publicFolder = checkParams(params.publicFolder, pkg.rooseveltConfig.publicFolder, defaultConfig.publicFolder)
  app.set('publicFolder', path.join(appDir, params.publicFolder))

  // use existence of public folder to determine first run
  if (!fsr.fileExists(path.join(appDir, params.publicFolder)) && !params.suppressLogs.rooseveltLogs) {
    // run the param audit
    require('./scripts/configAuditor')
  }

  // source remaining params from params argument, then package.json, then defaults
  params = {
    // behavior
    port: checkParams(process.env.HTTP_PORT, process.env.NODE_PORT, params.port, pkg.rooseveltConfig.port, defaultConfig.port),
    nodeEnv: params.nodeEnv,
    generateFolderStructure: checkParams(params.generateFolderStructure, pkg.rooseveltConfig.generateFolderStructure, defaultConfig.generateFolderStructure),
    localhostOnly: checkParams(params.localhostOnly, pkg.rooseveltConfig.localhostOnly, defaultConfig.localhostOnly),
    suppressLogs: params.suppressLogs,
    noMinify: checkParams(params.noMinify, pkg.rooseveltConfig.noMinify, defaultConfig.noMinify),
    htmlValidator: checkParams(params.htmlValidator, pkg.rooseveltConfig.htmlValidator, defaultConfig.htmlValidator),
    multipart: checkParams(params.multipart, pkg.rooseveltConfig.multipart, defaultConfig.multipart),
    toobusy: checkParams(params.toobusy, pkg.rooseveltConfig.toobusy, defaultConfig.toobusy),
    shutdownTimeout: checkParams(params.shutdownTimeout, pkg.rooseveltConfig.shutdownTimeout, defaultConfig.shutdownTimeout),
    bodyParserUrlencodedParams: checkParams(params.bodyParserUrlencodedParams, pkg.rooseveltConfig.bodyParserUrlencodedParams, defaultConfig.bodyParserUrlencodedParams),
    bodyParserJsonParams: checkParams(params.bodyParserJsonParams, pkg.rooseveltConfig.bodyParserJsonParams, defaultConfig.bodyParserJsonParams),

    // https behavior - generally no defaults, user-defined
    https: checkParams(params.https, pkg.rooseveltConfig.https, defaultConfig.https),

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
    css: checkParams(params.css, pkg.rooseveltConfig.css, defaultConfig.css),
    js: checkParams(params.js, pkg.rooseveltConfig.js, defaultConfig.js),

    // public
    publicFolder: params.publicFolder,
    favicon: checkParams(params.favicon, pkg.rooseveltConfig.favicon, defaultConfig.favicon),
    staticsSymlinksToPublic: checkParams(params.staticsSymlinksToPublic, pkg.rooseveltConfig.staticsSymlinksToPublic, defaultConfig.staticsSymlinksToPublic),
    versionedPublic: checkParams(params.versionedPublic, pkg.rooseveltConfig.versionedPublic, defaultConfig.versionedPublic),
    alwaysHostPublic: checkParams(params.alwaysHostPublic, pkg.rooseveltConfig.alwaysHostPublic, defaultConfig.alwaysHostPublic),

    // events
    onServerInit: params.onServerInit || undefined,
    onServerStart: params.onServerStart || undefined,
    onReqStart: params.onReqStart || undefined,
    onReqBeforeRoute: params.onReqBeforeRoute || undefined,
    onReqAfterRoute: params.onReqAfterRoute || undefined
  }

  // map mvc paths
  app.set('modelsPath', path.join(appDir, params.modelsPath))
  app.set('viewsPath', path.join(appDir, params.viewsPath))
  app.set('controllersPath', path.join(appDir, params.controllersPath))

  // map statics paths
  app.set('staticsRoot', path.normalize(params.staticsRoot))
  params.css.sourceDir = path.join(params.staticsRoot, params.css.sourceDir)
  params.js.sourceDir = path.join(params.staticsRoot, params.js.sourceDir)
  params.css.output = path.join(params.staticsRoot, params.css.output)
  params.js.output = path.join(params.staticsRoot, params.js.output)
  params.js.bundler.output = path.join(params.js.sourceDir, params.js.bundler.output)
  app.set('cssPath', path.join(appDir, params.css.sourceDir))
  app.set('jsPath', path.join(appDir, params.js.sourceDir))
  app.set('cssCompiledOutput', path.join(appDir, params.css.output))
  app.set('jsCompiledOutput', path.join(appDir, params.js.output))

  // determine statics prefix if any
  params.staticsPrefix = params.versionedPublic ? pkg.version || '' : ''

  // ensure 404 page exists
  params.error404 = path.join(app.get('controllersPath'), params.error404)
  if (!fsr.fileExists(params.error404)) {
    params.error404 = path.join(__dirname, '../defaultErrorPages/controllers/404.js')
  }

  // ensure 500 page exists
  params.error5xx = path.join(app.get('controllersPath'), params.error5xx)
  if (!fsr.fileExists(params.error5xx)) {
    params.error5xx = path.join(__dirname, '../defaultErrorPages/controllers/5xx.js')
  }

  // ensure 503 page exists
  params.error503 = path.join(app.get('controllersPath'), params.error503)
  if (!fsr.fileExists(params.error503)) {
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

  app.set('params', params)

  return app
}
