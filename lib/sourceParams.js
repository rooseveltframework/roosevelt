// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('@colors/colors')
const path = require('path')
const appModulePath = require('app-module-path')
const Logger = require('roosevelt-logger')
const sourceConfigs = require('source-configs')
const defaults = require('./defaults/config')
const template = require('es6-template-strings')
let pkg
let pkgConfig
let configFile
const configTemplateLiterals = []

module.exports = (params, app, appSchema) => {
  const appDir = params.appDir

  // determine if app has a package.json
  try {
    pkg = require(path.join(appDir, 'package.json'))
  } catch {
    pkg = {}
  }

  // ensure rooseveltConfig is an object
  pkgConfig = pkg.rooseveltConfig || {}

  // determine if app has a config file
  try {
    configFile = require(path.join(appDir, 'rooseveltConfig.json'))
  } catch (err) {
    if (err.name === 'SyntaxError') {
      console.error(err)
    }
    configFile = {}
  }

  // source-configs configuration
  const config = {
    sources: [
      'command line',
      'environment variable',
      params,
      configFile,
      pkgConfig
    ],
    logging: false,
    // handle configuration edge cases
    transform: (params, flags) => {
      // handle --production-mode, --prod, -p cli flags etc
      if (flags.productionProxyMode || flags.prodproxy || flags.x) {
        params.mode = 'production-proxy'
      } else if (flags.productionMode || flags.prod || flags.p) {
        params.mode = 'production'
      } else if (flags.developmentMode || flags.dev || flags.d) {
        // handle --development-mode, --dev, -d cli flags
        params.mode = 'development'
      }

      // handle --build and -b cli flags
      if (flags.build || flags.b) {
        params.makeBuildArtifacts = 'staticsOnly'
      }

      // handle --webpack, --wp, -w cli flags
      if (flags.webpack === 'verbose' || flags.wp === 'verbose' || flags.w === 'verbose') {
        params.js.webpack.verbose = true
      }
      if (flags.webpack === 'verbose-file' || flags.wp === 'verbose-file' || flags.w === 'verbose-file') {
        params.js.webpack.verbose = 'file'
      }

      // handle --disable-validator, --raw, -r cli flags
      if (flags.disableValidator || flags.raw || flags.r) {
        params.htmlValidator.enable = false
      } else if (flags.enableValidator || flags.htmlValidator || flags.h) {
        // handle --enable-validator, --html-validator, -h cli flags
        params.htmlValidator.enable = true
      }

      // default mode param to production if its value is invalid
      if (params.mode !== 'production-proxy' && params.mode !== 'production' && params.mode !== 'development') {
        params.mode = 'production'
      }

      return params
    }
  }

  /**
   * Parameters are sourced via the following priority:
   * 1. command line arguments
   * 2. environment variables
   * 3. object passed to roosevelt function
   * 4. rooseveltConfig in package.json
   * 5. defaults (stored in lib/defaults/config.json)
   */
  const schema = {
    appDir: {
      default: appDir
    },
    port: {
      envVar: ['HTTP_PORT', 'NODE_PORT'],
      default: defaults.port
    },
    mode: {
      envVar: ['NODE_ENV'],
      default: defaults.mode
    },
    enableCLIFlags: {
      default: defaults.enableCLIFlags
    },
    makeBuildArtifacts: {
      default: defaults.makeBuildArtifacts
    },
    localhostOnly: {
      default: defaults.localhostOnly
    },
    logging: {
      default: defaults.logging
    },
    minify: {
      default: defaults.minify
    },
    expressSessionStore: {
      instance: {
        default: defaults.expressSessionStore.instance
      },
      preset: {
        default: defaults.expressSessionStore.preset
      },
      presetOptions: {
        default: defaults.expressSessionStore.presetOptions
      }
    },
    htmlValidator: {
      enable: {
        default: defaults.htmlValidator.enable
      },
      exceptions: {
        requestHeader: {
          default: defaults.htmlValidator.exceptions.requestHeader
        },
        modelValue: {
          default: defaults.htmlValidator.exceptions.modelValue
        }
      },
      validatorConfig: {
        default: defaults.htmlValidator.validatorConfig
      }
    },
    formidable: {
      default: defaults.formidable
    },
    toobusy: {
      maxLagPerRequest: {
        default: defaults.toobusy.maxLagPerRequest
      },
      lagCheckInterval: {
        default: defaults.toobusy.lagCheckInterval
      },
      enable: {
        default: defaults.toobusy.enable
      }
    },
    helmet: {
      default: defaults.helmet
    },
    csrfProtection: {
      default: defaults.csrfProtection
    },
    expressSession: {
      default: defaults.expressSession
    },
    bodyParser: {
      urlEncoded: {
        default: defaults.bodyParser.urlEncoded
      },
      json: {
        default: defaults.bodyParser.json
      }
    },
    frontendReload: {
      enable: {
        default: defaults.frontendReload.enable
      },
      port: {
        default: defaults.frontendReload.port
      },
      httpsPort: {
        default: defaults.frontendReload.httpsPort
      },
      verbose: {
        default: defaults.frontendReload.verbose
      }
    },
    cores: {
      commandLineArg: ['--cores', '-c'],
      default: defaults.cores
    },
    shutdownTimeout: {
      default: defaults.shutdownTimeout
    },
    https: {
      enable: {
        default: defaults.https.enable
      },
      force: {
        default: defaults.https.force
      },
      autoCert: {
        default: defaults.https.autoCert
      },
      port: {
        envVar: ['HTTPS_PORT'],
        default: defaults.https.port
      },
      authInfoPath: {
        default: null
      },
      passphrase: {
        default: null
      },
      caCert: {
        default: null
      },
      requestCert: {
        default: null
      },
      rejectUnauthorized: {
        default: null
      }
    },
    secretsDir: {
      default: defaults.secretsDir
    },
    modelsPath: {
      default: defaults.modelsPath
    },
    viewsPath: {
      default: defaults.viewsPath
    },
    viewEngine: {
      default: defaults.viewEngine
    },
    controllersPath: {
      default: defaults.controllersPath
    },
    errorPages: {
      notFound: {
        default: defaults.errorPages.notFound
      },
      unauthorized: {
        default: defaults.errorPages.unauthorized
      },
      internalServerError: {
        default: defaults.errorPages.internalServerError
      },
      serviceUnavailable: {
        default: defaults.errorPages.serviceUnavailable
      }
    },
    routePrefix: {
      default: defaults.routePrefix
    },
    staticsRoot: {
      default: defaults.staticsRoot
    },
    html: {
      sourcePath: {
        default: defaults.html.sourcePath
      },
      allowlist: {
        default: defaults.html.allowlist
      },
      blocklist: {
        default: defaults.html.blocklist
      },
      models: {
        default: defaults.html.models
      },
      output: {
        default: defaults.html.output
      },
      minifier: {
        enable: {
          default: defaults.html.minifier.enable
        },
        exceptionRoutes: {
          default: defaults.html.minifier.exceptionRoutes
        },
        options: {
          default: defaults.html.minifier.options
        }
      }
    },
    css: {
      sourcePath: {
        default: defaults.css.sourcePath
      },
      compiler: {
        enable: {
          default: defaults.css.compiler.enable
        },
        module: {
          default: defaults.css.compiler.module
        },
        options: {
          default: defaults.css.compiler.options
        }
      },
      minifier: {
        enable: {
          default: defaults.css.minifier.enable
        },
        options: {
          default: defaults.css.minifier.options
        }
      },
      allowlist: {
        default: defaults.css.allowlist
      },
      output: {
        default: defaults.css.output
      },
      versionFile: {
        default: defaults.css.versionFile
      }
    },
    js: {
      sourcePath: {
        default: defaults.js.sourcePath
      },
      webpack: {
        enable: {
          default: defaults.js.webpack.enable
        },
        bundles: {
          default: defaults.js.webpack.bundles
        },
        verbose: {
          default: defaults.js.webpack.verbose
        }
      }
    },
    publicFolder: {
      default: defaults.publicFolder
    },
    favicon: {
      default: defaults.favicon
    },
    symlinks: {
      default: defaults.symlinks
    },
    versionedPublic: {
      default: defaults.versionedPublic
    },
    hostPublic: {
      default: defaults.hostPublic
    },
    clientViews: {
      allowlist: {
        default: defaults.clientViews.allowlist
      },
      blocklist: {
        default: defaults.clientViews.blocklist
      },
      output: {
        default: defaults.clientViews.output
      },
      exposeAll: {
        default: defaults.clientViews.exposeAll
      },
      defaultBundle: {
        default: defaults.clientViews.defaultBundle
      },
      minify: {
        default: defaults.clientViews.minify
      },
      minifyOptions: {
        default: defaults.clientViews.minifyOptions
      }
    },
    isomorphicControllers: {
      output: {
        default: defaults.isomorphicControllers.output
      },
      file: {
        default: defaults.isomorphicControllers.file
      }
    },
    onServerInit: {
      default: {}
    },
    onStaticAssetsGenerated: {
      default: {}
    },
    onServerStart: {
      default: {}
    },
    onAppExit: {
      default: {}
    },
    onReqStart: {
      default: {}
    },
    onReqBeforeRoute: {
      default: {}
    },
    onReqAfterRoute: {
      default: {}
    },
    onClientViewsProcess: {
      default: {}
    },
    cssCompiler: {
      default: {}
    }
  }

  // If a schema is passed in, update any necessary command line flags and environment variables
  if (appSchema !== undefined && appSchema.rooseveltConfig !== undefined) {
    updateFlagsAndEnvVars(schema, appSchema.rooseveltConfig)
  }

  params = sourceConfigs(schema, config)

  // resolve path params
  params.staticsRoot = path.join(appDir, params.staticsRoot)
  params.unversionedPublic = path.join(appDir, params.publicFolder)
  params.publicFolder = path.join(params.unversionedPublic, params.versionedPublic ? pkg.version || '' : '')
  params.html.sourcePath = path.join(params.staticsRoot, params.html.sourcePath)
  params.html.output = path.join(params.unversionedPublic, params.html.output)
  params.css.sourcePath = path.join(params.staticsRoot, params.css.sourcePath)
  params.css.output = path.join(params.publicFolder, params.css.output)
  params.js.sourcePath = path.join(params.staticsRoot, params.js.sourcePath)
  params.clientViews.output = path.join(params.publicFolder, params.clientViews.output)
  params.isomorphicControllers.output = path.join(params.publicFolder, params.isomorphicControllers.output)

  let passes = 3

  // scan for variables in params and resolve them
  ;(function paramVariables (paramSet, paramSource) {
    paramSource = paramSource || params

    // iterate over param object
    if (paramSet === Object(paramSet)) {
      for (const paramKey in paramSet) {
        const param = paramSet[paramKey]

        // recurse if param value is an object (but not a function)
        if (param === Object(param) && typeof param !== 'function') {
          paramVariables(param, paramSource[paramKey])
        } else if (typeof param === 'string' && /\${.*}/.test(param)) {
          // pushes all config variables into an array for later checks
          configTemplateLiterals.push(param)

          // run param through template parser
          let sourceParam = template(param, params, { partial: true })

          // normalize paths
          if (sourceParam.includes(appDir)) {
            sourceParam = path.normalize(sourceParam)
          }

          // convert number strings into numbers
          if (!isNaN(sourceParam) && !isNaN(parseFloat(sourceParam))) {
            sourceParam = parseInt(sourceParam)
          }

          // convert string booleans into booleans
          if (sourceParam === 'true') {
            sourceParam = true
          }
          if (sourceParam === 'false') {
            sourceParam = false
          }

          // bind parsed param to config
          paramSource[paramKey] = sourceParam
        }
      }
      return configTemplateLiterals
    }

    passes--

    // repeat this process for 3 passes
    if (passes > 0) {
      paramVariables(params)
    }
  })(params)

  // configure logger with params
  const logger = new Logger(params.logging)

  // set mode specific overrides
  if (params.mode === 'production' || params.mode === 'production-proxy') {
    process.env.NODE_ENV = 'production'

    // html validator is always disabled in production mode
    params.htmlValidator.enable = false
  } else if (params.mode === 'development') {
    process.env.NODE_ENV = 'development'

    // minification is always disabled in development mode
    params.minify = false
  }

  // hostPublic always true in dev mode
  if (params.mode === 'development') {
    params.hostPublic = true
  }

  // force localhostOnly and hostPublic off in production-proxy mode
  if (params.mode === 'production-proxy') {
    params.localhostOnly = true
    params.hostPublic = false
  }

  // sanitize the routePrefix param
  if (params.routePrefix && typeof params.routePrefix === 'string') {
    params.routePrefix = params.routePrefix.trim()

    // append a slash if one doesn't exist
    if (!params.routePrefix.startsWith('/')) {
      params.routePrefix = `/${params.routePrefix}`
    }

    // remove trailing slash if one exists
    if (params.routePrefix.endsWith('/')) {
      params.routePrefix = params.routePrefix.slice(0, -1)
    }
  } else {
    // default it to empty string if not set
    params.routePrefix = ''
  }

  // make the app directory requirable
  appModulePath.addPath(appDir)

  // make the models directory requirable
  appModulePath.addPath(path.join(appDir, params.modelsPath, '../'))

  // make the controllers directory requirable
  appModulePath.addPath(path.join(appDir, params.controllersPath, '../'))

  // expose express variables
  if (app) {
    // expose app environment
    app.set('env', params.mode === 'production-proxy' ? 'production' : params.mode)

    // expose instance of roosevelt-logger module
    app.set('logger', logger)

    // expose app configuration
    app.set('params', params)

    // expose app directory
    app.set('appDir', appDir)

    // expose contents of package.json if any
    app.set('package', pkg)

    // expose app name, supplying a default if not specified
    app.set('appName', pkg.name || 'Roosevelt Express')

    // expose app version
    app.set('appVersion', pkg.version)

    // map routePrefix
    app.set('routePrefix', params.routePrefix)

    // map mvc paths
    app.set('modelsPath', path.join(appDir, params.modelsPath))
    app.set('viewsPath', path.join(appDir, params.viewsPath))
    app.set('controllersPath', path.join(appDir, params.controllersPath))

    // map statics paths
    app.set('staticsRoot', params.staticsRoot)
    app.set('htmlPath', params.html.sourcePath)
    app.set('htmlModels', params.html.models)
    app.set('cssPath', params.css.sourcePath)
    app.set('jsPath', params.js.sourcePath)
    app.set('htmlRenderedOutput', params.html.output)
    app.set('cssCompiledOutput', params.css.output)
    app.set('clientViewsBundledOutput', params.clientViews.output)
    app.set('isomorphicControllersListOutput', params.isomorphicControllers.output)
    app.set('publicFolder', params.unversionedPublic)
  }

  let extract

  // goes through all config variables and checks if it exists
  for (const row in configTemplateLiterals) {
    extract = configTemplateLiterals[row].match(/\${(.*)}/).pop()

    const ex = getOrSetObjectByDotNotation(params, extract)
    if (!ex) {
      logger.warn(`Config variable ${extract} does not exist.`)
    }
  }

  return params
}

// Recursively sets the command line flags and environment variables of the schema based on given params.
function updateFlagsAndEnvVars (schema, params) {
  for (const key in params) {
    if (key === 'commandLineArg' || key === 'envVar') {
      console.log(`setting ${key} to ${params[key]}`)
      schema[key] = params[key]
    } else if (schema[key] !== undefined) {
      updateFlagsAndEnvVars(schema[key], params[key])
    }
  }
}

// gets or sets an object by dot notation, e.g. thing.nestedThing.furtherNestedThing: two arguments gets, three arguments sets
function getOrSetObjectByDotNotation (obj, dotNotation, value) {
  if (!dotNotation || typeof dotNotation === 'boolean' || typeof dotNotation === 'number') {
    return dotNotation
  }
  if (typeof dotNotation === 'string') {
    return getOrSetObjectByDotNotation(obj, dotNotation.split('.'), value)
  } else if (dotNotation.length === 1 && value !== undefined) {
    obj[dotNotation[0]] = value
    return obj[dotNotation[0]]
  } else if (dotNotation.length === 0) {
    return obj
  } else if (dotNotation.length === 1) {
    if (obj) {
      return obj[dotNotation[0]]
    }
    return false
  } else {
    return getOrSetObjectByDotNotation(obj[dotNotation[0]], dotNotation.slice(1), value)
  }
}
