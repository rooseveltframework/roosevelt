// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')
const path = require('path')
const appModulePath = require('app-module-path')
const defaultConfig = require('./defaults/config')
const sourceConfigs = require('source-configs')
const fsr = require('./tools/fsr')()
let pkg

module.exports = function (app) {
  const Logger = require('roosevelt-logger')
  const logger = new Logger()
  let params = app.get('params')
  const appDir = params.appDir

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
      logger.warn(`Roosevelt initialized and configured solely via constructor! (${e.toString().includes('rooseveltConfig') ? 'No rooseveltConfig found in package.json' : 'No package.json found'})`)
      logger.warn(`No files will be auto-generated unless you set param "generateFolderStructure" to true in the constructor as well. Only do that if you're sure you want Roosevelt to generate files in ${appDir}!`)
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

  params.publicFolder = checkParam('publicFolder')
  app.set('publicFolder', path.join(appDir, params.publicFolder))

  // use existence of public folder to determine first run
  params.logging = checkParam('logging')
  if (!fsr.fileExists(path.join(appDir, params.publicFolder)) && params.logging.methods.info) {
    // run the param audit
    require('./scripts/configAuditor').audit(app.get('appDir'))
  }

  // Get param from nested object
  function getParam (parentObject, keys) {
    const keysArr = [...keys]
    const childObjKey = keysArr.shift()
    const param = parentObject[childObjKey]
    if (param === undefined) {
      return undefined
    } else if (keysArr.length === 0) {
      return param
    } else {
      return getParam(param, keysArr)
    }
  }

  // Source params from params argument then package.json, then defaults
  function checkParam (paramName, keys) {
    let param

    // If param is not in an object (keys undefined), check params for it. Else, recurse down the parent objects to find the param.
    let sourceParam
    if (keys === undefined) {
      sourceParam = params[paramName]
    } else {
      sourceParam = getParam(params, [...keys, paramName])
    }

    // If not in an object, check package.json for it. Else if wasn't found in params, recurse down package.json parent objects.
    let sourcePkg
    if (keys === undefined) {
      sourcePkg = pkg.rooseveltConfig[paramName]
    } else if (sourceParam === undefined) {
      sourcePkg = getParam(pkg.rooseveltConfig, [...keys, paramName])
    }

    // If not in an object, check default config for it. Else if wasn't found in package.json, recurse down default config's parent objects.
    let sourceDefault
    if (keys === undefined) {
      sourceDefault = defaultConfig[paramName]
    } else if (sourcePkg === undefined) {
      sourceDefault = getParam(defaultConfig, [...keys, paramName])
    }

    if (sourceParam !== undefined) {
      param = sourceParam
    } else if (sourcePkg !== undefined) {
      param = sourcePkg
    } else {
      param = sourceDefault
    }

    return param
  }

  // source remaining params from params argument, then package.json, then defaults
  const schema = {
    port: {
      envVar: ['HTTP_PORT', 'NODE_PORT'],
      default: checkParam('port')
    },
    enableCLIFlags: {
      default: checkParam('enableCLIFlags')
    },
    generateFolderStructure: {
      default: checkParam('generateFolderStructure')
    },
    localhostOnly: {
      default: checkParam('localhostOnly')
    },
    logging: {
      default: params.logging
    },
    minify: {
      default: checkParam('minify')
    },
    htmlValidator: {
      enable: {
        default: checkParam('enable', ['htmlValidator'])
      },
      separateProcess: {
        enable: {
          default: checkParam('enable', ['htmlValidator', 'separateProcess'])
        },
        autoKiller: {
          default: checkParam('autoKiller', ['htmlValidator', 'separateProcess'])
        },
        autoKillerTimeout: {
          default: checkParam('autoKillerTimeout', ['htmlValidator', 'separateProcess'])
        }
      },
      port: {
        default: checkParam('port', ['htmlValidator'])
      },
      showWarnings: {
        default: checkParam('showWarnings', ['htmlValidator'])
      },
      exceptions: {
        requestHeader: {
          default: checkParam('requestHeader', ['htmlValidator', 'exceptions'])
        },
        modelValue: {
          default: checkParam('modelValue', ['htmlValidator', 'exceptions'])
        }
      }
    },
    multipart: {
      default: checkParam('multipart')
    },
    toobusy: {
      maxLagPerRequest: {
        default: checkParam('maxLagPerRequest', ['toobusy'])
      },
      lagCheckInterval: {
        default: checkParam('lagCheckInterval', ['toobusy'])
      }
    },
    bodyParser: {
      urlEncoded: {
        default: checkParam('urlEncoded', ['bodyParser'])
      },
      json: {
        default: checkParam('json', ['bodyParser'])
      }
    },
    checkDependencies: {
      default: checkParam('checkDependencies')
    },
    shutdownTimeout: {
      default: checkParam('shutdownTimeout')
    },
    cores: {
      default: checkParam('cores')
    },
    cleanTimer: {
      default: checkParam('cleanTimer')
    },
    frontendReload: {
      enable: {
        default: checkParam('enable', ['frontendReload'])
      },
      port: {
        default: checkParam('port', ['frontendReload'])
      },
      httpsPort: {
        default: checkParam('httpsPort', ['frontendReload'])
      },
      verbose: {
        default: checkParam('verbose', ['frontendReload'])
      }
    },
    https: {
      default: checkParam('https')
    },
    modelsPath: {
      default: checkParam('modelsPath')
    },
    viewsPath: {
      default: checkParam('viewsPath')
    },
    viewEngine: {
      default: checkParam('viewEngine')
    },
    controllersPath: {
      default: checkParam('controllersPath')
    },
    errorPages: {
      notFound: {
        default: checkParam('notFound', ['errorPages'])
      },
      internalServerError: {
        default: checkParam('internalServerError', ['errorPages'])
      },
      serviceUnavailable: {
        default: checkParam('serviceUnavailable', ['errorPages'])
      }
    },
    routers: {
      default: checkParam('routers')
    },
    staticsRoot: {
      default: checkParam('staticsRoot')
    },
    htmlMinifier: {
      enable: {
        default: checkParam('enable', ['htmlMinifier'])
      },
      exceptionRoutes: {
        default: checkParam('exceptionRoutes', ['htmlMinifier'])
      },
      options: {
        default: checkParam('options', ['htmlMinifier'])
      }
    },
    css: {
      sourcePath: {
        default: checkParam('sourcePath', ['css'])
      },
      compiler: {
        default: checkParam('compiler', ['css'])
      },
      whitelist: {
        default: checkParam('whitelist', ['css'])
      },
      output: {
        default: checkParam('output', ['css'])
      },
      symlinkToPublic: {
        default: checkParam('symlinkToPublic', ['css'])
      },
      versionFile: {
        default: checkParam('versionFile', ['css'])
      }
    },
    js: {
      sourcePath: {
        default: checkParam('sourcePath', ['js'])
      },
      compiler: {
        default: checkParam('compiler', ['js'])
      },
      whitelist: {
        default: checkParam('whitelist', ['js'])
      },
      blacklist: {
        default: checkParam('blacklist', ['js'])
      },
      output: {
        default: checkParam('output', ['js'])
      },
      symlinkToPublic: {
        default: checkParam('symlinkToPublic', ['js'])
      },
      bundler: {
        bundles: {
          default: checkParam('bundles', ['js', 'bundler'])
        },
        output: {
          default: checkParam('output', ['js', 'bundler'])
        },
        expose: {
          default: checkParam('expose', ['js', 'bundler'])
        }
      }
    },
    publicFolder: {
      default: params.publicFolder
    },
    favicon: {
      default: checkParam('favicon')
    },
    staticsSymlinksToPublic: {
      default: checkParam('staticsSymlinksToPublic')
    },
    versionedPublic: {
      default: checkParam('versionedPublic')
    },
    alwaysHostPublic: {
      default: checkParam('alwaysHostPublic')
    },
    onServerInit: {
      default: params.onServerInit || {}
    },
    onServerStart: {
      default: params.onServerStart || {}
    },
    onReqStart: {
      default: params.onReqStart || {}
    },
    onReqBeforeRoute: {
      default: params.onReqBeforeRoute || {}
    },
    onReqAfterRoute: {
      default: params.onReqAfterRoute || {}
    },
    jsCompiler: {
      default: params.jsCompiler || {}
    },
    cssCompiler: {
      default: params.cssCompiler || {}
    }
  }
  params = sourceConfigs(schema)

  const flags = require('./sourceFlags')(params.enableCLIFlags) // parse cli args

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
