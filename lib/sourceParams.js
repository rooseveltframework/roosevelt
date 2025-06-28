// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app
require('@colors/colors')
const path = require('path')
const sourceConfigs = require('source-configs')
const defaults = require('./defaults/config')
const template = require('./tools/templateLiteralRenderer')

module.exports = (params, appSchema) => {
  const appDir = params.appDir

  // set makeBuildArtifacts by env var
  if (process.env.MAKE_BUILD_ARTIFACTS === 'true') params.makeBuildArtifacts = true
  if (process.env.MAKE_BUILD_ARTIFACTS === 'false') params.makeBuildArtifacts = false
  if (process.env.MAKE_BUILD_ARTIFACTS === 'staticsOnly') params.makeBuildArtifacts = 'staticsOnly'

  // determine if app has a package.json
  let pkg
  try {
    pkg = require(path.join(appDir, 'package.json'))
  } catch {
    pkg = {}
  }

  // determine if app has a config file
  let configFile
  try {
    configFile = require(path.join(appDir, 'rooseveltConfig.json'))
    if (!configFile) {
      try {
        configFile = require(path.join(appDir, 'roosevelt.config.json'))
      } catch (err) {
        if (err.name === 'SyntaxError') console.error('❌', err)
        configFile = {}
      }
    }
  } catch (err) {
    if (err.name === 'SyntaxError') console.error('❌', err)
    configFile = {}
  }

  // source-configs configuration
  const config = {
    sources: [
      'command line',
      'environment variable',
      params,
      configFile,
      pkg.rooseveltConfig || {}
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

      // handle --jsbundler, --jsb, -j cli flags
      if (flags.jsbundler === 'verbose' || flags.jsb === 'verbose' || flags.j === 'verbose') {
        params.js.verbose = true
      }
      if (flags.jsbundler === 'verbose-file' || flags.jsb === 'verbose-file' || flags.j === 'verbose-file') {
        params.js.verbose = 'file'
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
   * parameters are sourced via the following priority:
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
    http: {
      enable: {
        default: defaults.http.enable
      },
      port: {
        envVar: ['HTTP_PORT'],
        default: defaults.http.port
      }
    },
    https: {
      enable: {
        default: defaults.https.enable
      },
      autoCert: {
        default: defaults.https.autoCert
      },
      port: {
        envVar: ['HTTPS_PORT', 'NODE_PORT'],
        default: defaults.https.port
      },
      options: {
        default: defaults.https.options
      }
    },
    mode: {
      envVar: ['NODE_ENV'],
      default: defaults.mode
    },
    deprecationChecks: {
      default: defaults.deprecationChecks
    },
    expressVersion: {
      default: defaults.expressVersion
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
      filename: {
        default: defaults.expressSessionStore.filename
      },
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
      exceptionRoutes: {
        default: defaults.frontendReload.exceptionRoutes
      },
      expressBrowserReloadParams: {
        default: defaults.frontendReload.expressBrowserReloadParams
      }
    },
    shutdownTimeout: {
      default: defaults.shutdownTimeout
    },
    secretsPath: {
      default: defaults.secretsPath
    },
    modelsPath: {
      default: defaults.modelsPath
    },
    viewsPath: {
      default: defaults.viewsPath
    },
    preprocessedViewsPath: {
      default: defaults.preprocessedViewsPath
    },
    preprocessedStaticsPath: {
      default: defaults.preprocessedStaticsPath
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
      forbidden: {
        default: defaults.errorPages.forbidden
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
      folderPerPage: {
        default: defaults.html.folderPerPage
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
        customBundlerFunction: {
          default: defaults.js.webpack.customBundlerFunction
        }
      },
      customBundler: {
        enable: {
          default: defaults.js.customBundler.enable
        },
        bundles: {
          default: defaults.js.customBundler.bundles
        },
        customBundlerFunction: {
          default: defaults.js.customBundler.customBundlerFunction
        }
      },
      verbose: {
        default: defaults.js.verbose
      }
    },
    buildFolder: {
      default: defaults.buildFolder
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
    copy: {
      default: defaults.copy
    },
    minifyHtmlAttributes: {
      enable: {
        default: defaults.minifyHtmlAttributes.enable
      },
      minifyHtmlAttributesParams: {
        default: defaults.minifyHtmlAttributes.minifyHtmlAttributesParams
      }
    },
    prodSourceMaps: {
      default: defaults.prodSourceMaps
    },
    versionedPublic: {
      default: defaults.versionedPublic
    },
    hostPublic: {
      default: defaults.hostPublic
    },
    clientViews: {
      enable: {
        default: defaults.clientViews.enable
      },
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
    clientControllers: {
      enable: {
        default: defaults.clientControllers.enable
      },
      allowlist: {
        default: defaults.clientControllers.allowlist
      },
      blocklist: {
        default: defaults.clientControllers.blocklist
      },
      output: {
        default: defaults.clientControllers.output
      },
      exposeAll: {
        default: defaults.clientControllers.exposeAll
      },
      defaultBundle: {
        default: defaults.clientControllers.defaultBundle
      }
    },
    onBeforeMiddleware: {
      default: {}
    },
    onBeforeControllers: {
      default: {}
    },
    onBeforeStatics: {
      default: {}
    },
    onServerInit: {
      default: {}
    },
    onServerStart: {
      default: {}
    },
    onAppExit: {
      default: {}
    },
    onClientViewsProcess: {
      default: {}
    },
    cssCompiler: {
      default: {}
    }
  }

  // if a schema is passed in, update any necessary command line flags and environment variables
  if (appSchema !== undefined && appSchema.rooseveltConfig !== undefined) {
    updateFlagsAndEnvVars(schema, appSchema.rooseveltConfig)
  }

  params = sourceConfigs(schema, config)

  // set mode specific overrides
  if (params.mode === 'production' || params.mode === 'production-proxy') {
    process.env.NODE_ENV = 'production'
  } else if (params.mode === 'development') {
    process.env.NODE_ENV = 'development'
  }

  // resolve NODE_PORT env var to http port if https is disabled
  if (!params.https.enable && params.http.enable && !isNaN(process.env.NODE_PORT)) params.http.port = process.env.NODE_PORT

  // resolve path params
  params.staticsRoot = path.join(appDir, params.staticsRoot)
  params.secretsPath = path.join(appDir, params.secretsPath)
  params.modelsPath = path.join(appDir, params.modelsPath)
  params.viewsPath = path.join(appDir, params.viewsPath)
  if (params.preprocessedViewsPath) params.preprocessedViewsPath = path.join(appDir, params.preprocessedViewsPath)
  if (params.preprocessedStaticsPath) params.preprocessedStaticsPath = path.join(appDir, params.preprocessedStaticsPath)
  params.controllersPath = path.join(appDir, params.controllersPath)
  params.buildFolder = path.join(appDir, params.buildFolder)
  params.unversionedPublic = path.join(appDir, params.publicFolder)
  params.publicFolder = path.join(params.unversionedPublic, params.versionedPublic ? pkg.version || '' : '')
  params.html.sourcePath = path.join(params.staticsRoot, params.html.sourcePath)
  params.html.output = path.join(params.unversionedPublic, params.html.output)
  params.css.sourcePath = (params?.minifyHtmlAttributes?.enable === 'development' || (params?.minifyHtmlAttributes?.enable && process.env.NODE_ENV === 'production')) ? path.join(params.preprocessedStaticsPath, params.css.sourcePath) : path.join(params.staticsRoot, params.css.sourcePath)
  params.css.output = path.join(params.publicFolder, params.css.output)
  params.js.sourcePath = (params?.minifyHtmlAttributes?.enable === 'development' || (params?.minifyHtmlAttributes?.enable && process.env.NODE_ENV === 'production')) ? path.join(params.preprocessedStaticsPath, params.js.sourcePath) : path.join(params.staticsRoot, params.js.sourcePath)
  params.clientViews.output = path.join(params.buildFolder, params.clientViews.output)
  params.clientControllers.output = path.join(params.buildFolder, params.clientControllers.output)
  params.pkg = pkg

  // scan for variables in params and resolve them
  const configTemplateLiterals = []
  let passes = 3
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
          let sourceParam = template(param, params)

          // normalize paths
          if (sourceParam.includes(appDir)) {
            sourceParam = path.normalize(sourceParam)
          }

          // convert number strings into numbers
          if (!isNaN(sourceParam) && !isNaN(parseFloat(sourceParam))) {
            sourceParam = parseInt(sourceParam)
          }

          // convert string booleans into booleans
          if (sourceParam === 'true') sourceParam = true
          if (sourceParam === 'false') sourceParam = false

          // bind parsed param to config
          paramSource[paramKey] = sourceParam
        }
      }
      return configTemplateLiterals
    }

    // repeat this process for 3 passes
    passes--
    if (passes > 0) paramVariables(params)
  })(params)

  // set mode specific overrides
  if (params.mode === 'production' || params.mode === 'production-proxy') {
    // html validator is always disabled in production mode
    params.htmlValidator.enable = false
  } else if (params.mode === 'development') {
    // minification is always disabled in development mode
    params.minify = false
  }

  // disable https by env var
  if (process.env.DISABLE_HTTPS === 'true') {
    params.https.enable = false
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

  return params
}

// recursively sets the command line flags and environment variables of the schema based on given params.
function updateFlagsAndEnvVars (schema, params) {
  for (const key in params) {
    if (key === 'commandLineArg' || key === 'envVar') {
      schema[key] = params[key]
    } else if (schema[key] !== undefined) updateFlagsAndEnvVars(schema[key], params[key])
  }
}
