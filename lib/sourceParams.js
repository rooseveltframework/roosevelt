// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app

require('colors')
const path = require('path')
const appModulePath = require('app-module-path')
const Logger = require('roosevelt-logger')
const sourceConfigs = require('source-configs')
const defaults = require('./defaults/config')
const template = require('es6-template-strings')
let pkg
let pkgConfig

module.exports = (params, app) => {
  const appDir = params.appDir

  // determine if app has a package.json
  try {
    pkg = require(path.join(appDir, 'package.json'))
  } catch {
    pkg = {}
  }

  // ensure rooseveltConfig is an object
  pkgConfig = pkg.rooseveltConfig || {}

  // source-configs configuration
  const config = {
    sources: [
      'command line',
      'environment variable',
      params,
      pkgConfig
    ],
    logging: false,
    // handle configuration edge cases
    transform: (params, flags) => {
      // env variables first

      // handle ROOSEVELT_VALIDATOR env var
      if (process.env.ROOSEVELT_VALIDATOR === 'attached') {
        params.htmlValidator.separateProcess.enable = false
      } else if (process.env.ROOSEVELT_VALIDATOR === 'detached') {
        params.htmlValidator.separateProcess.enable = true
      }

      // handle ROOSEVELT_AUTOKILLER env var
      if (process.env.ROOSEVELT_AUTOKILLER === 'on') {
        params.htmlValidator.separateProcess.autoKiller = true
      } else if (process.env.ROOSEVELT_AUTOKILLER === 'off') {
        params.htmlValidator.separateProcess.autoKiller = false
      }

      // cli flags next

      // handle --production-mode, --prod, -p cli flags
      if (flags.productionMode || flags.prod || flags.p) {
        params.mode = 'production'
      } else if (flags.developmentMode || flags.dev || flags.d) {
        // handle --development-mode, --dev, -d cli flags
        params.mode = 'development'
      }

      // handle --disable-validator, --raw, -r cli flags
      if (flags.disableValidator || flags.raw || flags.r) {
        params.htmlValidator.enable = false
      } else if (flags.enableValidator || flags.htmlValidator || flags.h) {
        // handle --enable-validator, --html-validator, -h cli flags
        params.htmlValidator.enable = true
      }

      // handle --attach-validator, -a cli flags
      if (flags.attachValidator || flags.a) {
        params.htmlValidator.separateProcess.enable = false
      } else if (flags.backgroundValidator || flags.b) {
        // handle --background-validator, -b cli flags
        params.htmlValidator.separateProcess.enable = true
      }

      // handle --disable-validator-autokiller, --no-autokiller, -n cli flags
      if (flags.disableValidatorAutokiller || flags.autokiller === false || flags.n) {
        params.htmlValidator.separateProcess.autoKiller = false
      } else if (flags.enableValidatorAutokiller || flags.htmlValidatorAutokiller || flags.k) {
        // handle --enable-validator-autokiller, --html-validator-autokiller, -k cli flags
        params.htmlValidator.separateProcess.autoKiller = true
      }

      // default mode param to production if its value is invalid
      if (params.mode !== 'production' && params.mode !== 'development') {
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
      default: params.appDir
    },
    port: {
      envVar: ['HTTP_PORT', 'NODE_PORT'],
      default: defaults.port
    },
    mode: {
      default: defaults.mode
    },
    enableCLIFlags: {
      default: defaults.enableCLIFlags
    },
    generateFolderStructure: {
      default: defaults.generateFolderStructure
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
    htmlValidator: {
      enable: {
        default: defaults.htmlValidator.enable
      },
      separateProcess: {
        enable: {
          default: defaults.htmlValidator.separateProcess.enable
        },
        autoKiller: {
          default: defaults.htmlValidator.separateProcess.autoKiller
        },
        autoKillerTimeout: {
          default: defaults.htmlValidator.separateProcess.autoKillerTimeout
        }
      },
      port: {
        default: defaults.htmlValidator.port
      },
      showWarnings: {
        default: defaults.htmlValidator.showWarnings
      },
      exceptions: {
        requestHeader: {
          default: defaults.htmlValidator.exceptions.requestHeader
        },
        modelValue: {
          default: defaults.htmlValidator.exceptions.modelValue
        }
      }
    },
    multipart: {
      default: defaults.multipart
    },
    toobusy: {
      maxLagPerRequest: {
        default: defaults.toobusy.maxLagPerRequest
      },
      lagCheckInterval: {
        default: defaults.toobusy.lagCheckInterval
      }
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
    checkDependencies: {
      default: defaults.checkDependencies
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
      port: {
        envVar: ['HTTPS_PORT'],
        default: defaults.https.port
      },
      authInfoPath: {
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
      internalServerError: {
        default: defaults.errorPages.internalServerError
      },
      serviceUnavailable: {
        default: defaults.errorPages.serviceUnavailable
      }
    },
    routers: {
      default: defaults.routers
    },
    staticsRoot: {
      default: defaults.staticsRoot
    },
    htmlMinifier: {
      enable: {
        default: defaults.htmlMinifier.enable
      },
      exceptionRoutes: {
        default: defaults.htmlMinifier.exceptionRoutes
      },
      options: {
        default: defaults.htmlMinifier.options
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
      whitelist: {
        default: defaults.css.whitelist
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
        }
      }
    },
    publicFolder: {
      default: defaults.publicFolder
    },
    favicon: {
      default: defaults.favicon
    },
    staticsSymlinksToPublic: {
      default: defaults.staticsSymlinksToPublic
    },
    versionedPublic: {
      default: defaults.versionedPublic
    },
    alwaysHostPublic: {
      commandLineArg: ['--host-public', '--statics', '-s'],
      default: defaults.alwaysHostPublic
    },
    clientViews: {
      whitelist: {
        default: defaults.clientViews.whitelist
      },
      blacklist: {
        default: defaults.clientViews.blacklist
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
    onServerInit: {
      default: {}
    },
    onServerStart: {
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
  params = sourceConfigs(schema, config)

  // resolve path params
  params.staticsRoot = path.join(appDir, params.staticsRoot)
  params.unversionedPublic = path.join(appDir, params.publicFolder)
  params.publicFolder = path.join(params.unversionedPublic, params.versionedPublic ? pkg.version || '' : '')
  params.css.sourcePath = path.join(params.staticsRoot, params.css.sourcePath)
  params.css.output = path.join(params.publicFolder, params.css.output)
  params.js.sourcePath = path.join(params.staticsRoot, params.js.sourcePath)
  params.clientViews.output = path.join(params.publicFolder, params.clientViews.output)

  let passes = 3

  // scan for variables in params and resolve them
  ;(function paramVariables (paramSet, paramSource) {
    paramSource = paramSource || params

    // iterate over param object
    if (paramSet === Object(paramSet)) {
      for (const paramKey in paramSet) {
        const param = paramSet[paramKey]

        // recurse if param value is an object
        if (param === Object(param)) {
          paramVariables(param, paramSource[paramKey])
        } else if (typeof param === 'string' && /\${.*}/.test(param)) {
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
  if (params.mode === 'production') {
    process.env.NODE_ENV = 'production'

    // html validator is always disabled in production mode
    params.htmlValidator.enable = false
  } else if (params.mode === 'development') {
    process.env.NODE_ENV = 'development'

    // minification is always disabled in development mode
    params.minify = false
  }

  // handle HTTP_PROXY edge case
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    if (process.env.NO_PROXY && !process.env.NO_PROXY.includes('localhost')) {
      params.htmlValidator.enable = false
      logger.warn('HTML validator disabled. This feature cannot be used when a system-wide proxy is set (HTTP_PROXY or HTTPS_PROXY) without "localhost" defined as an exception in the NO_PROXY environment variable.')
    }
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
    app.set('env', params.mode)

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

    // map mvc paths
    app.set('modelsPath', path.join(appDir, params.modelsPath))
    app.set('viewsPath', path.join(appDir, params.viewsPath))
    app.set('controllersPath', path.join(appDir, params.controllersPath))

    // map statics paths
    app.set('staticsRoot', params.staticsRoot)
    app.set('cssPath', params.css.sourcePath)
    app.set('jsPath', params.js.sourcePath)
    app.set('cssCompiledOutput', params.css.output)
    app.set('clientViewsBundledOutput', params.clientViews.output)
    app.set('publicFolder', params.unversionedPublic)
  }

  return params
}
