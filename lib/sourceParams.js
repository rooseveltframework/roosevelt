// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')

const path = require('path')
const checkParams = require('./tools/checkParams')
const appModulePath = require('app-module-path')
const defaultConfig = require('./defaults/config')
const fsr = require('./tools/fsr')()
let pkg

module.exports = function (app) {
  const logger = require('./tools/logger')(app.get('params').logging)
  let params = app.get('params')
  let flags
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

  // default env to production
  process.env.NODE_ENV = 'production'
  app.set('env', 'production')

  pkg.rooseveltConfig = pkg.rooseveltConfig || {}

  app.set('appDir', appDir)
  app.set('package', pkg)
  app.set('appName', pkg.name || 'Roosevelt Express')
  app.set('appVersion', pkg.version)

  params.logging = checkParams(params.logging, pkg.rooseveltConfig.logging, defaultConfig.logging)

  params.publicFolder = checkParams(params.publicFolder, pkg.rooseveltConfig.publicFolder, defaultConfig.publicFolder)
  app.set('publicFolder', path.join(appDir, params.publicFolder))

  // use existence of public folder to determine first run
  if (!fsr.fileExists(path.join(appDir, params.publicFolder)) && params.logging.appStatus) {
    // run the param audit
    require('./scripts/configAuditor').audit(app.get('appDir'))
  }

  // source remaining params from params argument, then package.json, then defaults
  params = {
    // behavior
    port: checkParams(process.env.HTTP_PORT, process.env.NODE_PORT, params.port, pkg.rooseveltConfig.port, defaultConfig.port),
    enableCLIFlags: checkParams(params.enableCLIFlags, pkg.rooseveltConfig.enableCLIFlags, defaultConfig.enableCLIFlags),
    generateFolderStructure: checkParams(params.generateFolderStructure, pkg.rooseveltConfig.generateFolderStructure, defaultConfig.generateFolderStructure),
    localhostOnly: checkParams(params.localhostOnly, pkg.rooseveltConfig.localhostOnly, defaultConfig.localhostOnly),
    logging: params.logging,
    minify: checkParams(params.minify, pkg.rooseveltConfig.minify, defaultConfig.minify),
    htmlValidator: checkParams(params.htmlValidator, pkg.rooseveltConfig.htmlValidator, defaultConfig.htmlValidator),
    multipart: checkParams(params.multipart, pkg.rooseveltConfig.multipart, defaultConfig.multipart),
    toobusy: checkParams(params.toobusy, pkg.rooseveltConfig.toobusy, defaultConfig.toobusy),
    bodyParser: checkParams(params.bodyParser, pkg.rooseveltConfig.bodyParser, defaultConfig.bodyParser),
    checkDependencies: checkParams(params.checkDependencies, pkg.rooseveltConfig.checkDependencies, defaultConfig.checkDependencies),
    shutdownTimeout: checkParams(params.shutdownTimeout, pkg.rooseveltConfig.shutdownTimeout, defaultConfig.shutdownTimeout),
    cores: checkParams(params.cores, pkg.rooseveltConfig.cores, defaultConfig.cores),
    cleanTimer: checkParams(params.cleanTimer, pkg.rooseveltConfig.cleanTimer, defaultConfig.cleanTimer),

    // https behavior - generally no defaults, user-defined
    https: checkParams(params.https, pkg.rooseveltConfig.https, defaultConfig.https),

    // mvc
    modelsPath: checkParams(params.modelsPath, pkg.rooseveltConfig.modelsPath, defaultConfig.modelsPath),
    viewsPath: checkParams(params.viewsPath, pkg.rooseveltConfig.viewsPath, defaultConfig.viewsPath),
    viewEngine: checkParams(params.viewEngine, pkg.rooseveltConfig.viewEngine, defaultConfig.viewEngine),
    controllersPath: checkParams(params.controllersPath, pkg.rooseveltConfig.controllersPath, defaultConfig.controllersPath),
    errorPages: checkParams(params.errorPages, pkg.rooseveltConfig.errorPages, defaultConfig.errorPages),

    // statics
    staticsRoot: checkParams(params.staticsRoot, pkg.rooseveltConfig.staticsRoot, defaultConfig.staticsRoot),
    htmlMinifier: checkParams(params.htmlMinifier, pkg.rooseveltConfig.htmlMinifier, defaultConfig.htmlMinifier),
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

  flags = require('./sourceFlags')(params.enableCLIFlags) // parse cli args

  // override node env with command line setting
  if (flags.productionMode) {
    app.set('env', 'production')
    process.env.NODE_ENV = 'production'
  } else if (flags.developmentMode) {
    app.set('env', 'development')
    process.env.NODE_ENV = 'development'
  }

  // give priority to params overridden by CLI/env
  if (flags.enableValidator) {
    params.htmlValidator.enable = true
  } else if (flags.disableValidator) {
    params.htmlValidator.enable = false
  }
  if (process.env.ROOSEVELT_VALIDATOR === 'detached') {
    params.htmlValidator.separateProcess.enable = true
  } else if (process.env.ROOSEVELT_VALIDATOR === 'attached') {
    params.htmlValidator.separateProcess.enable = false
  }
  if (flags.enableAutokiller) {
    params.htmlValidator.separateProcess.autoKiller = true
  } else if (flags.disableAutokiller) {
    params.htmlValidator.separateProcess.autoKiller = false
  }
  if (process.env.ROOSEVELT_AUTOKILLER === 'on') {
    params.htmlValidator.separateProcess.autoKiller = true
  } else if (process.env.ROOSEVELT_AUTOKILLER === 'off') {
    params.htmlValidator.separateProcess.autoKiller = false
  }
  if (flags.backgroundValidator) {
    params.htmlValidator.separateProcess.enable = true
  } else if (flags.attachValidator) {
    params.htmlValidator.separateProcess.enable = false
  }
  if (flags.alwaysHostPublic) {
    params.alwaysHostPublic = true
  }
  if (app.get('env') === 'development') {
    params.minify = false
  } else if (app.get('env') === 'production') {
    params.htmlValidator.enable = false
  }
  if (flags.cores) {
    params.cores = flags.cores
  }
  if (process.env.HTTPS_PORT && params.https.port) {
    params.https.port = process.env.HTTPS_PORT
  }

  // map mvc paths
  app.set('modelsPath', path.join(appDir, params.modelsPath))
  app.set('viewsPath', path.join(appDir, params.viewsPath))
  app.set('controllersPath', path.join(appDir, params.controllersPath))

  // map statics paths
  app.set('staticsRoot', path.normalize(params.staticsRoot))
  app.set('cssPath', path.join(appDir, params.staticsRoot, params.css.sourcePath))
  app.set('jsPath', path.join(appDir, params.staticsRoot, params.js.sourcePath))
  app.set('cssCompiledOutput', path.join(appDir, params.staticsRoot, params.css.output))
  app.set('jsCompiledOutput', path.join(appDir, params.staticsRoot, params.js.output))
  app.set('jsBundledOutput', path.join(app.get('jsPath'), params.js.bundler.output))

  // add js/css directories to staticsSymlinksToPublic if conditions are met
  let jsSymlink
  let cssSymlink

  if (params.js.symlinkToPublic === true) {
    jsSymlink = true

    // disable feature if js directories are found in staticsSymlinksToPublic array
    params.staticsSymlinksToPublic.forEach(item => {
      if (item.includes(params.js.sourcePath) || item.includes(params.js.output)) {
        jsSymlink = false
      }
    })
  }

  if (params.css.symlinkToPublic === true) {
    cssSymlink = true

    // disable feature if css directories are found in staticsSymlinksToPublic array
    params.staticsSymlinksToPublic.forEach(item => {
      if (item.includes(params.css.sourcePath) || item.includes(params.css.output)) {
        cssSymlink = false
      }
    })
  }

  if (jsSymlink) {
    // determine status of js compiler
    if (params.js.compiler === 'none' || params.js.compiler === null) {
      params.staticsSymlinksToPublic.push(params.js.sourcePath)
    } else {
      params.staticsSymlinksToPublic.push(`js: ${params.js.output}`)
    }
  }

  if (cssSymlink) {
    // determine status of css compiler
    if (params.css.compiler === 'none' || params.css.compiler === null) {
      params.staticsSymlinksToPublic.push(params.css.sourcePath)
    } else {
      params.staticsSymlinksToPublic.push(`css: ${params.css.output}`)
    }
  }

  // determine statics prefix if any
  params.staticsPrefix = params.versionedPublic ? pkg.version || '' : ''

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
  app.set('flags', flags)

  return app
}
