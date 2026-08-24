// reads user supplied params from roosevelt constructor or from the app's package.json and configures the app
const path = require('path')
const sourceConfigs = require('source-configs')
const ref = require('./tools/configRef')

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
  // the config is a js file rather than json so that it can hold comments, real numbers and booleans, code that some bundlers require in their configs, and values built with roosevelt.ref
  let configFile = {}
  for (const name of ['roosevelt.config.js', 'rooseveltConfig.js']) {
    try {
      configFile = require(path.join(appDir, name)) || {}
      break
    } catch (err) {
      // a file that is simply absent is not an error, but one that exists and fails to load is worth showing rather than silently ignoring
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(name)) console.error('❌', err)
    }
  }

  // roosevelt's built in command line flags, which an app can rename by supplying a schema
  // they live here rather than in the schema below because source-configs' commandLineArg describes a flag that carries a value, and most of these are switches instead (a flag with no argument)
  // the order of the switches is their precedence, so listing --prod before --dev keeps --prod winning when both are supplied
  const commandLineFlags = {
    mode: {
      'production-proxy': ['--production-proxy-mode', '--prodproxy', '-x'],
      production: ['--production-mode', '--prod', '-p'],
      development: ['--development-mode', '--dev', '-d']
    },
    makeBuildArtifacts: {
      staticsOnly: ['--build', '-b']
    },
    htmlValidator: {
      enable: {
        false: ['--disable-validator', '--raw', '-r'],
        true: ['--enable-validator', '--html-validator', '-h']
      }
    },
    js: {
      verbose: ['--jsbundler', '--jsb', '-j']
    },
    logging: {
      quieterStartup: {
        true: ['--quieter-startup', '-q']
      }
    }
  }

  // source-configs configuration
  const config = {
    sources: [
      'command line',
      'environment variable',
      params,
      configFile
    ],
    logging: false,

    // handle configuration edge cases
    transform: (params, flags) => {
      // handle the mode flags, e.g. --production-mode, --prod, -p
      const mode = suppliedSwitch(flags, commandLineFlags.mode)
      if (mode !== undefined) params.mode = mode

      // handle the build flags, e.g. --build, -b
      const makeBuildArtifacts = suppliedSwitch(flags, commandLineFlags.makeBuildArtifacts)
      if (makeBuildArtifacts !== undefined) params.makeBuildArtifacts = makeBuildArtifacts

      // handle the js bundler flags, e.g. --jsbundler verbose, --jsb verbose-file
      const jsBundler = suppliedValue(flags, commandLineFlags.js.verbose)
      if (jsBundler === 'verbose') params.js.verbose = true
      if (jsBundler === 'verbose-file') params.js.verbose = 'file'

      // handle the quieter startup flags, e.g. --quieter-startup, -q
      const quieterStartup = suppliedSwitch(flags, commandLineFlags.logging.quieterStartup)
      if (quieterStartup !== undefined) params.logging.quieterStartup = quieterStartup === 'true'

      // handle the html validator flags, e.g. --disable-validator, --enable-validator
      // the switch keys are strings because they are object keys, so they are converted back to booleans here
      const htmlValidator = suppliedSwitch(flags, commandLineFlags.htmlValidator.enable)
      if (htmlValidator !== undefined) params.htmlValidator.enable = htmlValidator === 'true'

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
   * 4. roosevelt.config.js
   * 5. the defaults spelled out in the schema below
   */
  const schema = {
    appDir: {
      default: appDir
    },
    http: {
      enable: {
        default: true
      },
      port: {
        envVar: ['HTTP_PORT'],
        default: 43763
      }
    },
    https: {
      enable: {
        default: false
      },
      autoCert: {
        default: true
      },
      port: {
        envVar: ['HTTPS_PORT', 'NODE_PORT'],
        default: 43711
      },
      options: {
        default: {}
      }
    },
    mode: {
      envVar: ['NODE_ENV'],
      default: 'production'
    },
    deprecationChecks: {
      default: 'development-mode'
    },
    makeBuildArtifacts: {
      default: false
    },
    localhostOnly: {
      default: false
    },
    trustProxy: {
      default: 'auto'
    },
    logging: {
      default: {
        quieterStartup: false,
        methods: {
          http: true,
          info: true,
          warn: true,
          error: true,
          verbose: false
        }
      }
    },
    minify: {
      default: true
    },
    expressSessionStore: {
      filename: {
        default: 'sessions.sqlite'
      },
      instance: {
        default: null
      },
      maxInactivity: {
        default: 7889238000
      },
      preset: {
        default: 'default'
      },
      presetOptions: {
        default: {
          checkPeriod: 86400000
        }
      }
    },
    htmlValidator: {
      enable: {
        default: true
      },
      exceptions: {
        requestHeader: {
          default: 'Partial'
        },
        modelValue: {
          default: '_disableValidator'
        }
      },
      validatorConfig: {
        default: {}
      }
    },
    formidable: {
      default: {
        multiples: true
      }
    },
    helmet: {
      default: {}
    },
    csrfProtection: {
      default: true
    },
    expressSession: {
      default: true
    },
    bodyParser: {
      urlEncoded: {
        default: {
          extended: true
        }
      },
      json: {
        default: {}
      }
    },
    watchStatics: {
      enable: {
        default: true
      },
      additionalPaths: {
        default: []
      },
      debounce: {
        default: 100
      }
    },
    frontendReload: {
      enable: {
        default: true
      },
      exceptionRoutes: {
        default: []
      },
      expressBrowserReloadParams: {
        default: {
          skipDeletingConnections: true
        }
      }
    },
    shutdownTimeout: {
      default: 30000
    },
    secretsPath: {
      default: 'secrets'
    },
    modelsPath: {
      default: 'mvc/models'
    },
    viewsPath: {
      default: 'mvc/views'
    },
    preprocessedViewsPath: {
      default: '.build/preprocessed_views'
    },
    preprocessedStaticsPath: {
      default: '.build/preprocessed_statics'
    },
    viewEngine: {
      default: 'none'
    },
    controllersPath: {
      default: 'mvc/controllers'
    },
    errorPages: {
      notFound: {
        default: '404.js'
      },
      forbidden: {
        default: '403.js'
      },
      internalServerError: {
        default: '5xx.js'
      },
      serviceUnavailable: {
        default: '503.js'
      }
    },
    routePrefix: {
      default: null
    },
    staticsRoot: {
      default: 'statics'
    },
    html: {
      sourcePath: {
        default: 'pages'
      },
      allowlist: {
        default: null
      },
      blocklist: {
        default: null
      },
      models: {
        default: {}
      },
      output: {
        default: ''
      },
      folderPerPage: {
        default: false
      },
      minifier: {
        enable: {
          default: true
        },
        exceptionRoutes: {
          default: false
        },
        options: {
          default: {
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeEmptyAttributes: true
          }
        }
      }
    },
    css: {
      sourcePath: {
        default: 'css'
      },
      compiler: {
        enable: {
          default: false
        },
        module: {
          default: 'sass'
        },
        options: {
          default: {}
        }
      },
      minifier: {
        enable: {
          default: true
        },
        options: {
          default: {}
        }
      },
      allowlist: {
        default: null
      },
      output: {
        default: 'css'
      },
      versionFile: {
        default: null
      }
    },
    js: {
      sourcePath: {
        default: 'js'
      },
      bundler: {
        enable: {
          default: false
        },
        module: {
          default: 'webpack'
        }
      },
      bundles: {
        default: []
      },
      customBundlerFunction: {
        default: null
      },
      verbose: {
        default: false
      }
    },
    buildFolder: {
      default: '.build'
    },
    incrementalBuilds: {
      default: true
    },
    publicFolder: {
      default: 'public'
    },
    favicon: {
      default: 'none'
    },
    symlinks: {
      default: []
    },
    copy: {
      default: []
    },
    minifyHtmlAttributes: {
      enable: {
        default: false
      },
      minifyHtmlAttributesParams: {
        default: {}
      }
    },
    prodSourceMaps: {
      default: false
    },
    versionedPublic: {
      default: false
    },
    hostPublic: {
      default: true
    },
    clientViews: {
      enable: {
        default: false
      },
      allowlist: {
        default: {}
      },
      blocklist: {
        default: []
      },
      output: {
        default: 'js'
      },
      exposeAll: {
        default: false
      },
      defaultBundle: {
        default: 'views.js'
      },
      minify: {
        default: false
      },
      minifyOptions: {
        default: {}
      }
    },
    clientControllers: {
      enable: {
        default: false
      },
      allowlist: {
        default: {}
      },
      blocklist: {
        default: []
      },
      output: {
        default: 'js'
      },
      exposeAll: {
        default: false
      },
      defaultBundle: {
        default: 'controllers.js'
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
    onStaticsRebuilt: {
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
    updateCommandLineFlags(commandLineFlags, appSchema.rooseveltConfig)
    updateFlagsAndEnvVars(schema, appSchema.rooseveltConfig, commandLineFlags)
  }

  params = sourceWithEmptyEnvVarsUnset(schema, config)

  // done before the refs resolve so that the derivations below read complete objects, and again afterwards for the values the refs produce
  restoreObjectDefaults(schema, params)

  // set mode specific overrides
  if (params.mode === 'production' || params.mode === 'production-proxy') {
    process.env.NODE_ENV = 'production'
  } else if (params.mode === 'development') {
    process.env.NODE_ENV = 'development'
  }

  // resolve NODE_PORT env var to http port if https is disabled
  if (!params.https.enable && params.http.enable && process.env.NODE_PORT && !isNaN(process.env.NODE_PORT)) params.http.port = process.env.NODE_PORT

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

  // resolve any values the app declared with roosevelt.ref
  // this repeats until nothing is left, so a ref that reads a param produced by another ref still lands on a real value
  let refPasses = 10
  let stillRefs = []
  while (refPasses--) {
    stillRefs = []

    // a config can contain the same object twice, or contain itself, so each pass remembers what it has already walked rather than following it round again
    const walked = new WeakSet()

    ;(function resolveRefs (paramSet, trail) {
      if (walked.has(paramSet)) return
      walked.add(paramSet)

      for (const paramKey in paramSet) {
        const param = paramSet[paramKey]
        const where = trail ? `${trail}.${paramKey}` : paramKey

        if (ref.isRef(param)) {
          paramSet[paramKey] = ref.resolve(param, params)
          if (ref.isRef(paramSet[paramKey])) stillRefs.push(where) // a ref that returned another ref, so it needs another pass
        } else if (param === Object(param) && typeof param !== 'function') resolveRefs(param, where)
      }
    })(params, '')

    if (!stillRefs.length) break
  }

  // a ref that never resolves means two or more of them are waiting on each other, and leaving them in place would hand the app an empty object where it asked for a value
  if (stillRefs.length) {
    throw new Error(`Roosevelt could not work out a value for ${stillRefs.join(', ')}. Did you write a circular ref?.`)
  }

  // run again now that the refs have become real values, so a ref that returned part of an object param gets its defaults filled in the same way a literal one would
  restoreObjectDefaults(schema, params)

  // set mode specific overrides
  if (params.mode === 'production' || params.mode === 'production-proxy') {
    // html validator is always disabled in production mode
    params.htmlValidator.enable = false
  } else if (params.mode === 'development') {
    // minification is always disabled in development mode
    params.minify = false
  }

  // make noisy logs quieter
  if (process.env.QUIETER_STARTUP === 'true') params.logging.quieterStartup = true
  if (process.env.QUIETER_STARTUP === 'false') params.logging.quieterStartup = false

  // disable http by env var
  if (process.env.DISABLE_HTTP === 'true') {
    params.http.enable = false
  }

  // disable https by env var
  if (process.env.DISABLE_HTTPS === 'true') {
    params.https.enable = false
  }

  // switch from https to http by env var
  if (params.https.enable && process.env.SWAP_HTTPS_TO_HTTP === 'true') {
    params.http.enable = true
    params.https.enable = false
  }

  // hostPublic always true in dev mode
  if (params.mode === 'development') {
    params.hostPublic = true
  }

  // production-proxy mode means a web server sits in front of the app, so the app listens only to that web server and leaves serving the public folder to it
  if (params.mode === 'production-proxy') {
    params.localhostOnly = true
    params.hostPublic = false
  }

  // automatically decide what to set trustProxy to
  // in production-proxy mode, default to assuming there is exactly 1 proxy in front of the app
  // in every other mode, default to assuming there are no proxies in front of the app, therefore trustProxy being true or >0 would inappropriately let any request claim to be from any address
  if (params.trustProxy === 'auto') params.trustProxy = params.mode === 'production-proxy' ? 1 : false

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

// sources the config, treating any environment variable that is present but empty as though it were unset
// source-configs deliberately sources an env var that merely exists, empty or not, so that an empty string can be set on purpose
// roosevelt is looser: a blank env var means "not configured" and should fall through to the next config source, so the empty ones are temporarily removed while sourcing
function sourceWithEmptyEnvVarsUnset (schema, config) {
  const emptied = []
  for (const envVar of collectEnvVars(schema)) {
    if (process.env[envVar] === '') {
      emptied.push(envVar)
      delete process.env[envVar]
    }
  }
  try {
    return sourceConfigs(schema, config)
  } finally {
    // restore the environment so the rest of the app sees it as the user supplied it
    for (const envVar of emptied) process.env[envVar] = ''
  }
}

// source-configs treats a schema node's object default as one value, so an app that supplies part of one gets back only the part it supplied
// the rest goes missing, and roosevelt reads some of those sub-params directly: an app quieting logging.methods.info would find logging.methods.http gone too, which switches its http logging off without being asked
// so anything the app left out is filled back in underneath what it did supply, which is how a schema that spells out its sub-params already behaves
function restoreObjectDefaults (schemaNode, params) {
  for (const key in schemaNode) {
    const node = schemaNode[key]
    if (!isPlainObject(node)) continue

    // a node declaring a default is a param; one that does not is a group of them
    if ('default' in node) {
      if (isPlainObject(node.default)) fillMissing(node.default, params?.[key])
    } else restoreObjectDefaults(node, params?.[key])
  }
}

// adds only what is absent, so a value the app set is never overwritten
function fillMissing (defaults, target) {
  // the app may have replaced the object with something else entirely, or with a ref it expects roosevelt to resolve later, which is its business either way
  if (!isPlainObject(target)) return

  for (const key in defaults) {
    if (key in target) fillMissing(defaults[key], target[key])
    else target[key] = cloneDefault(defaults[key])
  }
}

// defaults belong to the schema, so what lands in params is a copy rather than a shared reference
// anything that is not a plain object or array is passed along as it is, since a default can legitimately be a function
function cloneDefault (value) {
  if (Array.isArray(value)) return value.map(cloneDefault)
  if (!isPlainObject(value)) return value

  const copy = {}
  for (const key in value) copy[key] = cloneDefault(value[key])
  return copy
}

// a ref is excluded on purpose: it is an object, but one roosevelt replaces wholesale once the params it reads are known
function isPlainObject (value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && !ref.isRef(value)
}

// recursively collects every environment variable name declared in the schema
function collectEnvVars (schema, envVars = new Set()) {
  for (const key in schema) {
    const value = schema[key]
    if (key === 'envVar') {
      for (const envVar of [].concat(value)) envVars.add(envVar)
    } else if (value !== null && typeof value === 'object') collectEnvVars(value, envVars)
  }
  return envVars
}

// recursively sets the command line flags and environment variables of the schema based on given params.
// `flags` is the matching branch of roosevelt's built in flag table; where one exists, the app is renaming a built in flag rather than adding a new one, so the override is applied to the table and kept away from source-configs, which would misread a switch as a flag that carries a value
function updateFlagsAndEnvVars (schema, params, flags) {
  for (const key in params) {
    if (key === 'commandLineArg' || key === 'envVar') {
      if (key === 'commandLineArg' && flags !== undefined) continue
      schema[key] = params[key]
    } else if (schema[key] !== undefined) updateFlagsAndEnvVars(schema[key], params[key], flags?.[key])
  }
}

// renames roosevelt's built in command line flags based on what the app supplied, e.g. { mode: { commandLineArg: { development: ['--dev-mode'] } } }
// a switch may be renamed one value at a time, so overriding only development leaves the production flags alone
function updateCommandLineFlags (flags, params) {
  for (const key in flags) {
    const supplied = params[key]
    if (!supplied) continue
    if (supplied.commandLineArg !== undefined) {
      if (Array.isArray(flags[key])) flags[key] = [].concat(supplied.commandLineArg)
      else flags[key] = { ...flags[key], ...supplied.commandLineArg }
    } else if (!Array.isArray(flags[key])) updateCommandLineFlags(flags[key], supplied)
  }
}

// source-configs (via yargs-parser) exposes --some-flag as both "some-flag" and "someFlag", so both spellings are checked
function flagSupplied (flags, flagNames) {
  for (const flagName of [].concat(flagNames || [])) {
    const name = String(flagName).replace(/^-+/, '')
    if (flags[name]) return true
    if (flags[name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())]) return true
  }
  return false
}

// returns the value a switch implies, e.g. supplying --dev yields "development"
function suppliedSwitch (flags, switches) {
  for (const value in switches) {
    if (flagSupplied(flags, switches[value])) return value
  }
}

// returns the value supplied to a flag that carries one, e.g. --jsbundler verbose yields "verbose"
function suppliedValue (flags, flagNames) {
  for (const flagName of [].concat(flagNames || [])) {
    const name = String(flagName).replace(/^-+/, '')
    if (flags[name] !== undefined) return flags[name]
    const camelCase = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
    if (flags[camelCase] !== undefined) return flags[camelCase]
  }
}
