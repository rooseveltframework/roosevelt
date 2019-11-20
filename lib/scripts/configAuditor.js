// check user config against default roosevelt configuration
const fs = require('fs-extra')
require('colors')

if (module.parent) {
  module.exports = {
    audit: configAudit
  }
} else {
  configAudit()
}

function configAudit (appDir) {
  const path = require('path')
  const Logger = require('roosevelt-logger')
  const logger = new Logger()
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let userConfig
  let userConfigKeys
  let userScripts
  let errors
  let processEnv
  if (!appDir) {
    if (process.env.INIT_CWD === process.cwd()) {
      processEnv = process.env.INIT_CWD
    } else if (fs.existsSync(path.join(process.cwd(), 'node_modules')) === false) {
      processEnv = process.cwd()
    } else if (fs.existsSync(path.join(process.env.INIT_CWD, 'node_modules')) === true) {
      processEnv = process.env.INIT_CWD
    } else {
      processEnv = undefined
    }
    appDir = processEnv
  }

  try {
    // if package or rooseveltConfig cannot be found (e.g., script triggered without app present), skip audit
    pkg = require(path.join(appDir, 'package.json'))
    if (!pkg.rooseveltConfig) {
      throw new Error('rooseveltConfig not found!')
    }

    // Make a deep copy of the package.json
    userConfig = JSON.parse(JSON.stringify(pkg.rooseveltConfig))
    userConfigKeys = Object.keys(userConfig)

    userScripts = pkg.scripts || {}
  } catch (e) {
    return
  }

  /**
   * Logs an error to the console displaying info about the extra param that was found
   *
   * @param {Array} keyList - list of keys from the keyStack
   */
  function foundExtra (keyList) {
    logger.error('⚠️', ` Extra param "${keyList.pop()}" found in ${keyList.join('.')}, this can be removed.`.bold)
    errors = true
  }

  /**
   * Type checker for config params - matches a list of types against a given param
   *
   * @param param - the value to be type checked against
   * @param key - the name of the param
   * @param types - the types to check against the param
   */
  function checkTypes (param, key, types) {
    if (param !== undefined) {
      let isCorrectType = false
      for (let i = 0; i < types.length; i++) {
        switch (types[i]) {
          case 'array':
            if (param instanceof Array) {
              isCorrectType = true
            }
            break
          case 'boolean':
            if (typeof param === 'boolean') {
              isCorrectType = true
            }
            break
          case 'null':
            if (param === null) {
              isCorrectType = true
            }
            break
          case 'number':
            if (typeof param === 'number') {
              isCorrectType = true
            }
            break
          case 'object':
            if (param instanceof Object) {
              isCorrectType = true
            }
            break
          case 'string':
            if (typeof param === 'string') {
              isCorrectType = true
            }
            break
        }
      }
      if (isCorrectType === false) {
        logger.error('⚠️', ` The type of param '${key}' should be one of the supported types: ${types.join(', ')}`)
        errors = true
      }
    }
  }

  // Object containing the keys of the params that are required to be in the user's config
  const requiredParams = {
    alwaysHostPublic: null,
    checkDependencies: null,
    cleanTimer: null,
    controllersPath: null,
    cores: null,
    enableCLIFlags: null,
    favicon: null,
    generateFolderStructure: null,
    https: null,
    localhostOnly: null,
    minify: null,
    modelsPath: null,
    multipart: null,
    port: null,
    publicFolder: null,
    routers: null,
    shutdownTimeout: null,
    staticsRoot: null,
    staticsSymlinksToPublic: null,
    versionedPublic: null,
    viewEngine: null,
    viewsPath: null,
    bodyParser: {
      urlEncoded: null,
      json: null
    },
    css: {
      sourcePath: null,
      compiler: null,
      whitelist: null,
      output: null,
      symlinkToPublic: null,
      versionFile: null
    },
    errorPages: {
      notFound: null,
      internalServerError: null,
      serviceUnavailable: null
    },
    frontendReload: {
      enable: null,
      port: null,
      httpsPort: null,
      verbose: null
    },
    htmlMinifier: {
      enable: null,
      exceptionRoutes: null
    },
    htmlValidator: {
      enable: null,
      separateProcess: {
        enable: null,
        autoKiller: null,
        autoKillerTimeout: null
      },
      port: null
    },
    logging: {
      methods: {
        http: null,
        info: null,
        warn: null,
        error: null,
        verbose: null
      }
    },
    js: {
      sourcePath: null,
      compiler: null,
      whitelist: null,
      blacklist: null,
      output: null,
      symlinkToPublic: null,
      bundler: {
        bundles: null,
        output: null,
        expose: null
      }
    },
    toobusy: {
      maxLagPerRequest: null,
      lagCheckInterval: null
    }
  }

  /**
   * When user config is audited, if a required param is found, remove its key from list of required params
   *
   * @param {Array} jsonPath - key stack used to go to specific layer of requiredParams object
   * @param {Object} paramObject - object to look through
   */
  function required (jsonPath, paramObject) {
    // key stack order goes from top layer to bottom layer
    const key = jsonPath[0]
    if (jsonPath.length > 1) {
      required(jsonPath.slice(1), paramObject[key])
    } else {
      delete paramObject[key]
    }
  }

  logger.info('📋', 'Starting rooseveltConfig audit...')

  /**
   * To check for extra params, call `foundExtra()` in the default case
   * To check for a missing param, add param's key to `requiredParams` object and call `required()` in the switch case
   * Auditing an object requires a `switch`, cases for each param, and to push/pop from `keyStack`
   * Check types by calling `checkTypes` and passing it a list of possible types it should be
  */
  const keyStack = []
  userConfigKeys.forEach(key => {
    keyStack.push(key)
    switch (key) {
      case 'alwaysHostPublic':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'checkDependencies':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'cleanTimer':
        required(keyStack, requiredParams)
        break
      case 'controllersPath':
        checkTypes(userConfig[key], key, ['string'])
        required(keyStack, requiredParams)
        break
      case 'cores':
        checkTypes(userConfig[key], key, ['number', 'string'])
        required(keyStack, requiredParams)
        break
      case 'enableCLIFlags':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'favicon':
        checkTypes(userConfig[key], key, ['null', 'string'])
        required(keyStack, requiredParams)
        break
      case 'generateFolderStructure':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'https':
        checkTypes(userConfig[key], key, ['boolean', 'object'])
        required(keyStack, requiredParams)
        break
      case 'localhostOnly':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'minify':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'modelsPath':
        checkTypes(userConfig[key], key, ['string'])
        required(keyStack, requiredParams)
        break
      case 'multipart':
        checkTypes(userConfig[key], key, ['boolean', 'object'])
        required(keyStack, requiredParams)
        break
      case 'port':
        checkTypes(userConfig[key], key, ['number', 'string'])
        required(keyStack, requiredParams)
        break
      case 'publicFolder':
        checkTypes(userConfig[key], key, ['string'])
        required(keyStack, requiredParams)
        break
      case 'routers':
        checkTypes(userConfig[key], key, ['boolean', 'object'])
        required(keyStack, requiredParams)
        break
      case 'shutdownTimeout':
        checkTypes(userConfig[key], key, ['number'])
        required(keyStack, requiredParams)
        break
      case 'staticsRoot':
        checkTypes(userConfig[key], key, ['string'])
        required(keyStack, requiredParams)
        break
      case 'staticsSymlinksToPublic':
        checkTypes(userConfig[key], key, ['array'])
        required(keyStack, requiredParams)
        break
      case 'versionedPublic':
        checkTypes(userConfig[key], key, ['boolean'])
        required(keyStack, requiredParams)
        break
      case 'viewEngine':
        checkTypes(userConfig[key], key, ['array', 'null', 'string'])
        required(keyStack, requiredParams)
        break
      case 'viewsPath':
        checkTypes(userConfig[key], key, ['string'])
        required(keyStack, requiredParams)
        break
      case 'bodyParser': {
        checkTypes(userConfig[key], key, ['object'])
        const bodyParserParam = userConfig[key] || {}
        Object.keys(bodyParserParam).forEach(bodyParserKey => {
          keyStack.push(bodyParserKey)
          switch (bodyParserKey) {
            case 'urlEncoded':
              checkTypes(bodyParserParam[bodyParserKey], bodyParserKey, ['object'])
              required(keyStack, requiredParams)
              break
            case 'json':
              checkTypes(bodyParserParam[bodyParserKey], bodyParserKey, ['object'])
              required(keyStack, requiredParams)
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(bodyParserKey)
        })
        break
      }
      case 'css': {
        checkTypes(userConfig[key], key, ['object'])
        const cssParam = userConfig[key] || {}
        Object.keys(cssParam).forEach(cssKey => {
          keyStack.push(cssKey)
          switch (cssKey) {
            case 'sourcePath':
              checkTypes(cssParam[cssKey], cssKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'compiler':
              checkTypes(cssParam[cssKey], cssKey, ['null', 'object', 'string'])
              required(keyStack, requiredParams)
              break
            case 'whitelist':
              checkTypes(cssParam[cssKey], cssKey, ['array', 'null'])
              required(keyStack, requiredParams)
              break
            case 'output':
              checkTypes(cssParam[cssKey], cssKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'symlinkToPublic':
              checkTypes(cssParam[cssKey], cssKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            case 'versionFile':
              checkTypes(cssParam[cssKey], cssKey, ['null', 'object'])
              required(keyStack, requiredParams)
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(cssKey)
        })
        break
      }
      case 'errorPages': {
        checkTypes(userConfig[key], key, ['object'])
        const errorPagesParam = userConfig[key] || {}
        Object.keys(errorPagesParam).forEach(errorPagesKey => {
          keyStack.push(errorPagesKey)
          switch (errorPagesKey) {
            case 'notFound':
              checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'internalServerError':
              checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'serviceUnavailable':
              checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
              required(keyStack, requiredParams)
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(errorPagesKey)
        })
        break
      }
      case 'frontendReload': {
        checkTypes(userConfig[key], key, ['object'])
        const reloadParam = userConfig[key] || {}
        Object.keys(reloadParam).forEach(reloadKey => {
          keyStack.push(reloadKey)
          switch (reloadKey) {
            case 'enable':
              checkTypes(reloadParam[reloadKey], reloadKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            case 'port':
              checkTypes(reloadParam[reloadKey], reloadKey, ['number'])
              required(keyStack, requiredParams)
              break
            case 'httpsPort':
              checkTypes(reloadParam[reloadKey], reloadKey, ['number'])
              required(keyStack, requiredParams)
              break
            case 'verbose':
              checkTypes(reloadParam[reloadKey], reloadKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(reloadKey)
        })
        break
      }
      case 'htmlMinifier': {
        checkTypes(userConfig[key], key, ['object'])
        const htmlMinParam = userConfig[key] || {}
        Object.keys(htmlMinParam).forEach(htmlMinKey => {
          keyStack.push(htmlMinKey)
          switch (htmlMinKey) {
            case 'enable':
              checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            case 'exceptionRoutes':
              checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['array', 'boolean', 'string'])
              required(keyStack, requiredParams)
              break
            case 'options':
              checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['object'])
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(htmlMinKey)
        })
        break
      }
      case 'htmlValidator': {
        checkTypes(userConfig[key], key, ['object'])
        const validatorParam = userConfig[key] || {}
        Object.keys(validatorParam).forEach(validatorKey => {
          keyStack.push(validatorKey)
          switch (validatorKey) {
            case 'enable':
              checkTypes(validatorParam[validatorKey], validatorKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            case 'separateProcess': {
              checkTypes(validatorParam[validatorKey], validatorKey, ['object'])
              const sepProcParam = validatorParam[validatorKey] || {}
              Object.keys(sepProcParam).forEach(sepProcKey => {
                keyStack.push(sepProcKey)
                switch (sepProcKey) {
                  case 'enable':
                    checkTypes(sepProcParam[sepProcKey], sepProcKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'autoKiller':
                    checkTypes(sepProcParam[sepProcKey], sepProcKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'autoKillerTimeout':
                    checkTypes(sepProcParam[sepProcKey], sepProcKey, ['number'])
                    required(keyStack, requiredParams)
                    break
                  default:
                    foundExtra(['rooseveltConfig', ...keyStack])
                }
                keyStack.pop(sepProcKey)
              })
              break
            }
            case 'port':
              checkTypes(validatorParam[validatorKey], validatorKey, ['number', 'string'])
              required(keyStack, requiredParams)
              break
            case 'showWarnings':
              checkTypes(validatorParam[validatorKey], validatorKey, ['boolean'])
              break
            case 'exceptions': {
              checkTypes(validatorParam[validatorKey], validatorKey, ['object'])
              const exceptionsParam = validatorParam[validatorKey] || {}
              Object.keys(exceptionsParam).forEach(exceptionKey => {
                keyStack.push(exceptionKey)
                switch (exceptionKey) {
                  case 'requestHeader':
                    checkTypes(exceptionsParam[exceptionKey], exceptionKey, ['string'])
                    break
                  case 'modelValue':
                    checkTypes(exceptionsParam[exceptionKey], exceptionKey, ['string'])
                    break
                  default:
                    foundExtra(['rooseveltConfig', ...keyStack])
                }
                keyStack.pop(exceptionKey)
              })
              break
            }
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(validatorKey)
        })
        break
      }
      case 'logging': {
        checkTypes(userConfig[key], key, ['object'])
        const loggingParam = userConfig[key] || {}
        Object.keys(loggingParam).forEach(loggingKey => {
          keyStack.push(loggingKey)
          switch (loggingKey) {
            case 'methods': {
              checkTypes(loggingParam[loggingKey], loggingKey, ['object'])
              const methodsParam = loggingParam[loggingKey] || {}
              Object.keys(methodsParam).forEach(methodsKey => {
                keyStack.push(methodsKey)
                switch (methodsKey) {
                  case 'http':
                    checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'info':
                    checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'warn':
                    checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'error':
                    checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  case 'verbose':
                    checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  default:
                    // ignore extra custom log types in the methods object
                }
                keyStack.pop(methodsKey)
              })
              break
            }
            default:
              // ignore extra params in logging object
          }
          keyStack.pop(loggingKey)
        })
        break
      }
      case 'js': {
        checkTypes(userConfig[key], key, ['object'])
        const jsParam = userConfig[key] || {}
        Object.keys(jsParam).forEach(jsKey => {
          keyStack.push(jsKey)
          switch (jsKey) {
            case 'sourcePath':
              checkTypes(jsParam[jsKey], jsKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'compiler':
              checkTypes(jsParam[jsKey], jsKey, ['null', 'object', 'string'])
              required(keyStack, requiredParams)
              break
            case 'whitelist':
              checkTypes(jsParam[jsKey], jsKey, ['array', 'null'])
              required(keyStack, requiredParams)
              break
            case 'blacklist':
              checkTypes(jsParam[jsKey], jsKey, ['array', 'null'])
              required(keyStack, requiredParams)
              break
            case 'output':
              checkTypes(jsParam[jsKey], jsKey, ['string'])
              required(keyStack, requiredParams)
              break
            case 'symlinkToPublic':
              checkTypes(jsParam[jsKey], jsKey, ['boolean'])
              required(keyStack, requiredParams)
              break
            case 'bundler': {
              checkTypes(jsParam[jsKey], jsKey, ['object'])
              const bundlerParam = jsParam[jsKey] || {}
              Object.keys(bundlerParam).forEach(bundlerKey => {
                keyStack.push(bundlerKey)
                switch (bundlerKey) {
                  case 'bundles':
                    checkTypes(bundlerParam[bundlerKey], bundlerKey, ['array'])
                    required(keyStack, requiredParams)
                    break
                  case 'output':
                    checkTypes(bundlerParam[bundlerKey], bundlerKey, ['string'])
                    required(keyStack, requiredParams)
                    break
                  case 'expose':
                    checkTypes(bundlerParam[bundlerKey], bundlerKey, ['boolean'])
                    required(keyStack, requiredParams)
                    break
                  default:
                    foundExtra(['rooseveltConfig', ...keyStack])
                }
                keyStack.pop(bundlerKey)
              })
              break
            }
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(jsKey)
        })
        break
      }
      case 'toobusy': {
        checkTypes(userConfig[key], key, ['object'])
        const busyParam = userConfig[key] || {}
        Object.keys(busyParam).forEach(busyKey => {
          keyStack.push(busyKey)
          switch (busyKey) {
            case 'maxLagPerRequest':
              checkTypes(busyParam[busyKey], busyKey, ['number'])
              required(keyStack, requiredParams)
              break
            case 'lagCheckInterval':
              checkTypes(busyParam[busyKey], busyKey, ['number'])
              required(keyStack, requiredParams)
              break
            default:
              foundExtra(['rooseveltConfig', ...keyStack])
          }
          keyStack.pop(busyKey)
        })
        break
      }
      default:
        foundExtra(['rooseveltConfig', ...keyStack])
    }
    keyStack.pop(key)
  })

  /**
   * Looks at the requiredParams object after auditing the params in the user config and logs and error if any are missing
   *
   * @param {Object} requiredParams - object containing the params that should be in the user config
   * @param {String} jsonPath - string containing object path to missing param
   */
  function checkMissingParams (requiredParams, jsonPath) {
    const params = Object.entries(requiredParams)
    params.map(([key, val]) => {
      // Check if param is an object. If so, there is another layer of params to look at
      if (val instanceof Object && val !== null) {
        checkMissingParams(val, jsonPath + '.' + key)
      } else {
        logger.error('⚠️', ` Missing param "${key}" in ${jsonPath}!`.bold)
        errors = true
      }
    })
  }

  // check for missing params in userConfig
  checkMissingParams(requiredParams, 'rooseveltConfig')

  /**
   * Checks user's scripts if the default script exists
   *
   * @param scripts - user's scripts
   * @param scriptKey - script key to access script from user's scripts
   */
  function checkMissingScript (scripts, scriptKey) {
    if (scripts[scriptKey] === undefined) {
      logger.error('⚠️', ` Missing script "${scriptKey}"!`.bold)
      errors = true
    }
  }

  /**
   * Checks user's scripts for outdated script
   *
   * @param scripts - user's scripts
   * @param scriptKey - script key to access script from user's scripts
   */
  function checkOutdatedScript (scripts, scriptKey) {
    if (scripts !== undefined && scripts[scriptKey] !== undefined) {
      if (scripts[scriptKey].includes('roosevelt') && scripts[scriptKey] !== defaultScripts[scriptKey].value) {
        logger.error('⚠️', ` Detected outdated script "${scriptKey}". Update contents to "${defaultScripts[scriptKey].value}" to restore functionality.`.bold)
        errors = true
      }
    }
  }

  let hasProdScript = false
  let hasDevScript = false

  defaultScriptKeys.forEach((script) => {
    switch (script) {
      case 'start':
      case 'production':
      case 'prod':
      case 'p':
        if (userScripts[script] !== undefined) {
          hasProdScript = true
        }
        break
      case 'development':
      case 'dev':
      case 'd':
        if (userScripts[script] !== undefined) {
          hasDevScript = true
        }
        break
      case 'dev-install':
        checkMissingScript(userScripts, script)
        checkOutdatedScript(userScripts, script)
        break
      case 'di':
        break
      case 'dev-prune':
        checkMissingScript(userScripts, script)
        checkOutdatedScript(userScripts, script)
        break
      case 'dp':
        break
      case 'kill-validator':
        checkMissingScript(userScripts, script)
        checkOutdatedScript(userScripts, script)
        break
      case 'kv':
        break
      case 'clean':
        checkMissingScript(userScripts, script)
        checkOutdatedScript(userScripts, script)
        break
      case 'c':
        break
      case 'config-audit':
        checkMissingScript(userScripts, script)
        checkOutdatedScript(userScripts, script)
        break
      case 'a':
        break
      case 'standard':
        break
      case 'stylelint':
        break
      case 'lint':
      case 'l':
        break
      case 'precommit':
      case 'pc':
        break
      case 'test':
        if (userScripts[script] === undefined) {
          logger.warn(` Missing recommended script "${script}"!`.bold)
          errors = true
        }
        break
    }
  })

  // output warning for missing start script
  if (!hasProdScript) {
    logger.warn(' Missing production run script(s).'.bold)
    errors = true
  }
  if (!hasDevScript) {
    logger.warn(' Missing development run script(s).'.bold)
    errors = true
  }

  if (errors) {
    logger.error('Issues have been detected in rooseveltConfig, please consult https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for details on each param.'.bold)
    logger.error('Or see https://github.com/rooseveltframework/roosevelt/blob/master/CONFIG.md for the latest sample rooseveltConfig.'.bold)
  } else {
    logger.info('✅', 'rooseveltConfig audit completed with no errors found.'.green)
  }
}
