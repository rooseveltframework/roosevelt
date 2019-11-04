// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')
const path = require('path')
const appModulePath = require('app-module-path')
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

  params.publicFolder = checkParam('public', 'publicFolder')
  app.set('publicFolder', path.join(appDir, params.publicFolder))

  const defaultLogging = {
    methods: {
      http: true,
      info: true,
      warn: true,
      error: true,
      verbose: false
    }
  }
  params.logging = checkParam(defaultLogging, 'logging')
  // use existence of public folder to determine first run
  if (!fsr.fileExists(path.join(appDir, params.publicFolder)) && params.logging.methods.info) {
    // run the param audit
    require('./scripts/configAuditor').audit(app.get('appDir'))
  }

  /**
   * Traverses through a base configuration (params, pkg, defaults) to retreive a param
   * Stops traversing as soon as a nested object can't be found, returns param as undefined
   * As long as there are keys, keep traversing
   * Otherwise, returns the param
   *
   * @param {Object} parentObject - object containing the param to be gotten
   * @param {Array} keys - the array containing the keys to go through nested objects, in-order
   */
  function getParam (parentObject, keys) {
    const keysArr = [...keys]
    const childObjKey = keysArr.shift()
    const param = parentObject[childObjKey]
    if (param === undefined) {
      return undefined
    } else if (keysArr.length > 0) {
      return getParam(param, keysArr)
    } else {
      return param
    }
  }

  /**
   * The keys param is optional. If absent, this function looks in the top layer in each config for the param
   * If keys exists, then the param to check for is nested in an object. Keys are in-order left to right.
   * Left being the key name of the least nested object
   * and the right being the name of the most nested object (parent object of param to be looked for)
   * After sourcing the param from the different config sources, it returns the defined param with highest priority
   *
   * @param {String} paramName - the string containing the name of the param you want to source
   * @param {Array} keys - the array of strings used as a path to traverse through nested objects in configs
   */
  function checkParam (paramDefault, paramName, keys) {
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

    // Return the param of highest priority as long as it isn't undefined
    if (sourceParam !== undefined) {
      param = sourceParam
    } else if (sourcePkg !== undefined) {
      param = sourcePkg
    } else {
      param = paramDefault
    }

    return param
  }

  // source remaining params from params argument, then package.json, then defaults
  const schema = {
    port: {
      envVar: ['HTTP_PORT', 'NODE_PORT'],
      default: checkParam(43711, 'port')
    },
    enableCLIFlags: {
      default: checkParam(true, 'enableCLIFlags')
    },
    generateFolderStructure: {
      default: checkParam(true, 'generateFolderStructure')
    },
    localhostOnly: {
      default: checkParam(true, 'localhostOnly')
    },
    logging: {
      default: params.logging
    },
    minify: {
      default: checkParam(true, 'minify')
    },
    htmlValidator: {
      enable: {
        default: checkParam(true, 'enable', ['htmlValidator'])
      },
      separateProcess: {
        enable: {
          default: checkParam(true, 'enable', ['htmlValidator', 'separateProcess'])
        },
        autoKiller: {
          default: checkParam(true, 'autoKiller', ['htmlValidator', 'separateProcess'])
        },
        autoKillerTimeout: {
          default: checkParam(3600000, 'autoKillerTimeout', ['htmlValidator', 'separateProcess'])
        }
      },
      port: {
        default: checkParam(48888, 'port', ['htmlValidator'])
      },
      showWarnings: {
        default: checkParam(true, 'showWarnings', ['htmlValidator'])
      },
      exceptions: {
        requestHeader: {
          default: checkParam('Partial', 'requestHeader', ['htmlValidator', 'exceptions'])
        },
        modelValue: {
          default: checkParam('_disableValidator', 'modelValue', ['htmlValidator', 'exceptions'])
        }
      }
    },
    multipart: {
      default: checkParam({ multiples: true }, 'multipart')
    },
    toobusy: {
      maxLagPerRequest: {
        default: checkParam(70, 'maxLagPerRequest', ['toobusy'])
      },
      lagCheckInterval: {
        default: checkParam(500, 'lagCheckInterval', ['toobusy'])
      }
    },
    bodyParser: {
      urlEncoded: {
        default: checkParam({ extended: true }, 'urlEncoded', ['bodyParser'])
      },
      json: {
        default: checkParam({}, 'json', ['bodyParser'])
      }
    },
    checkDependencies: {
      default: checkParam(true, 'checkDependencies')
    },
    shutdownTimeout: {
      default: checkParam(30000, 'shutdownTimeout')
    },
    cores: {
      default: checkParam(1, 'cores')
    },
    cleanTimer: {
      default: checkParam(604800000, 'cleanTimer')
    },
    frontendReload: {
      enable: {
        default: checkParam(true, 'enable', ['frontendReload'])
      },
      port: {
        default: checkParam(9856, 'port', ['frontendReload'])
      },
      httpsPort: {
        default: checkParam(9857, 'httpsPort', ['frontendReload'])
      },
      verbose: {
        default: checkParam(false, 'verbose', ['frontendReload'])
      }
    },
    https: {
      default: checkParam(false, 'https')
    },
    modelsPath: {
      default: checkParam('mvc/models', 'modelsPath')
    },
    viewsPath: {
      default: checkParam('mvc/views', 'viewsPath')
    },
    viewEngine: {
      default: checkParam('none', 'viewEngine')
    },
    controllersPath: {
      default: checkParam('mvc/controllers', 'controllersPath')
    },
    errorPages: {
      notFound: {
        default: checkParam('404.js', 'notFound', ['errorPages'])
      },
      internalServerError: {
        default: checkParam('5xx.js', 'internalServerError', ['errorPages'])
      },
      serviceUnavailable: {
        default: checkParam('503.js', 'serviceUnavailable', ['errorPages'])
      }
    },
    routers: {
      default: checkParam(false, 'routers')
    },
    staticsRoot: {
      default: checkParam('statics', 'staticsRoot')
    },
    htmlMinifier: {
      enable: {
        default: checkParam(true, 'enable', ['htmlMinifier'])
      },
      exceptionRoutes: {
        default: checkParam(false, 'exceptionRoutes', ['htmlMinifier'])
      },
      options: {
        default: checkParam({
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true
        }, 'options', ['htmlMinifier'])
      }
    },
    css: {
      sourcePath: {
        default: checkParam('css', 'sourcePath', ['css'])
      },
      compiler: {
        default: checkParam('none', 'compiler', ['css'])
      },
      whitelist: {
        default: checkParam(null, 'whitelist', ['css'])
      },
      output: {
        default: checkParam('.build/css', 'output', ['css'])
      },
      symlinkToPublic: {
        default: checkParam(true, 'symlinkToPublic', ['css'])
      },
      versionFile: {
        default: checkParam(null, 'versionFile', ['css'])
      }
    },
    js: {
      sourcePath: {
        default: checkParam('js', 'sourcePath', ['js'])
      },
      compiler: {
        default: checkParam('none', 'compiler', ['js'])
      },
      whitelist: {
        default: checkParam(null, 'whitelist', ['js'])
      },
      blacklist: {
        default: checkParam(null, 'blacklist', ['js'])
      },
      output: {
        default: checkParam('.build/js', 'output', ['js'])
      },
      symlinkToPublic: {
        default: checkParam(true, 'symlinkToPublic', ['js'])
      },
      bundler: {
        bundles: {
          default: checkParam([], 'bundles', ['js', 'bundler'])
        },
        output: {
          default: checkParam('.bundled', 'output', ['js', 'bundler'])
        },
        expose: {
          default: checkParam(true, 'expose', ['js', 'bundler'])
        }
      }
    },
    publicFolder: {
      default: params.publicFolder
    },
    favicon: {
      default: checkParam('none', 'favicon')
    },
    staticsSymlinksToPublic: {
      default: checkParam(['images'], 'staticsSymlinksToPublic')
    },
    versionedPublic: {
      default: checkParam(false, 'versionedPublic')
    },
    alwaysHostPublic: {
      default: checkParam(false, 'alwaysHostPublic')
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
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    if (process.env.NO_PROXY && !process.env.NO_PROXY.includes('localhost')) {
      params.htmlValidator.enable = false
      logger.warn('HTML validator disabled. This feature cannot be used when a system-wide proxy is set (HTTP_PROXY or HTTPS_PROXY) without "localhost" defined as an exception in the NO_PROXY environment variable.')
    }
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
