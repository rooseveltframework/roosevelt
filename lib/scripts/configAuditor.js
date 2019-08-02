// check user config against default roosevelt configuration
const fse = require('fs-extra')
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
  const defaultConfig = require('../defaults/config')
  const defaultConfigKeys = Object.keys(defaultConfig)
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let userConfig
  let userScripts
  let errors
  let processEnv
  if (!appDir) {
    if (process.env.INIT_CWD === process.cwd()) {
      processEnv = process.env.INIT_CWD
    } else if (fse.existsSync(path.join(process.cwd(), 'node_modules')) === false) {
      processEnv = process.cwd()
    } else if (fse.existsSync(path.join(process.env.INIT_CWD, 'node_modules')) === true) {
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
    userScripts = pkg.scripts || {}
  } catch (e) {
    return
  }

  /**
   * Checks if the param in userConfig is missing
   *
   * @param parent - the object that contains the child param
   * @param key - the key name for the child param
   * @param keyList - array containing the layers to the child param
   */
  function checkMissing (parent, key, keyList) {
    if (parent[key] === undefined) {
      logger.error('⚠️', ` Missing param "${key}" at ${keyList.join('.')}!`.bold)
      errors = true
    }
  }

  /**
   * Deletes object from userConfig which means it will be ignored at the
   * end when the auditor looks at what's left in the userConfig for extra params
   *
   * @param parent - the object that contains the child param
   * @param key - the key name for the child param
   */
  function ignoreExtras (parent, key) {
    delete parent[key]
  }

  logger.info('📋', 'Starting rooseveltConfig audit...')

  /**
   * To ignore extra params in an object, call `ignoreExtras()` at the end of the case given the object's key name and its parent object
   * Not using `delete` on a param leaves it in the `userConfig` and will be considered an extra param.
   * Using `ignoreExtras()` on an object will remove the object from the `userConfig`. This means the object won't be checked for extra params.
   * To check if a param is missing in the `userConfig`, pass in the parent object, its key, and the keyStack to `checkMissing()`
   * Otherwise, leaving out `checkMissing()` will not log an error that the param is missing (meaning param is optional)
   */
  const keyStack = ['rooseveltConfig']
  defaultConfigKeys.forEach((key) => {
    keyStack.push(key)
    switch (key) {
      case 'port':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'enableCLIFlags':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'generateFolderStructure':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'localhostOnly':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'logging':
        const loggingParam = userConfig[key] || {}
        const defaultLoggingParam = defaultConfig[key]
        const loggingKeys = Object.keys(defaultLoggingParam)
        loggingKeys.forEach((loggingKey) => {
          keyStack.push(loggingKey)
          switch (loggingKey) {
            case 'methods':
              const methodsParam = loggingParam[loggingKey] || {}
              const defaultMethodsParam = defaultLoggingParam[loggingKey]
              const methodsKeys = Object.keys(defaultMethodsParam)
              methodsKeys.forEach((methodsKey) => {
                keyStack.push(methodsKey)
                switch (methodsKey) {
                  case 'http':
                    checkMissing(methodsParam, methodsKey, keyStack)
                    delete methodsParam[methodsKey]
                    break
                  case 'info':
                    checkMissing(methodsParam, methodsKey, keyStack)
                    delete methodsParam[methodsKey]
                    break
                  case 'warn':
                    checkMissing(methodsParam, methodsKey, keyStack)
                    delete methodsParam[methodsKey]
                    break
                  case 'error':
                    checkMissing(methodsParam, methodsKey, keyStack)
                    delete methodsParam[methodsKey]
                    break
                  case 'verbose':
                    checkMissing(methodsParam, methodsKey, keyStack)
                    delete methodsParam[methodsKey]
                    break
                }
                keyStack.pop(methodsKey)
              })
              // Ignore extra custom log types in methods object
              ignoreExtras(loggingParam, loggingKey)
              break
          }
          keyStack.pop(loggingKey)
        })
        // Ignore extra objects/params in logging object
        ignoreExtras(userConfig, key)
        break
      case 'minify':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'htmlValidator':
        const validatorParam = userConfig[key] || {}
        const defaultValidatorParam = defaultConfig[key]
        const validatorKeys = Object.keys(defaultValidatorParam)
        validatorKeys.forEach((validatorKey) => {
          keyStack.push(validatorKey)
          switch (validatorKey) {
            case 'enable':
              checkMissing(validatorParam, validatorKey, keyStack)
              delete validatorParam[validatorKey]
              break
            case 'separateProcess':
              const sepProcParam = validatorParam[validatorKey] || {}
              const defaultSepProcParam = defaultValidatorParam[validatorKey]
              const sepProcKeys = Object.keys(defaultSepProcParam)
              sepProcKeys.forEach((sepProcKey) => {
                keyStack.push(sepProcKey)
                switch (sepProcKey) {
                  case 'enable':
                    checkMissing(sepProcParam, sepProcKey, keyStack)
                    delete sepProcParam[sepProcKey]
                    break
                  case 'autoKiller':
                    checkMissing(sepProcParam, sepProcKey, keyStack)
                    delete sepProcParam[sepProcKey]
                    break
                  case 'autoKillerTimeout':
                    checkMissing(sepProcParam, sepProcKey, keyStack)
                    delete sepProcParam[sepProcKey]
                    break
                }
                keyStack.pop(sepProcKey)
              })
              // Don't ignore extra params in the `separateProcess` object
              break
            case 'port':
              checkMissing(validatorParam, validatorKey, keyStack)
              delete validatorParam[validatorKey]
              break
            case 'showWarnings':
              delete validatorParam[validatorKey]
              break
            case 'exceptions':
              const exceptionsParam = validatorParam[validatorKey] || {}
              const defaultExceptionsParam = defaultValidatorParam[validatorKey]
              const exceptionsKeys = Object.keys(defaultExceptionsParam)
              exceptionsKeys.forEach((exceptionKey) => {
                keyStack.push(exceptionKey)
                switch (exceptionKey) {
                  case 'requestHeader':
                    delete exceptionsParam[exceptionKey]
                    break
                  case 'modelValue':
                    delete exceptionsParam[exceptionKey]
                    break
                }
                keyStack.pop(exceptionKey)
              })
              // Don't ignore extra params in the `exceptions` object
              break
          }
          keyStack.pop(validatorKey)
        })
        // Don't ignore extra params in the `htmlValidator` object
        break
      case 'multipart':
        delete userConfig[key]
        break
      case 'toobusy':
        const busyParam = userConfig[key] || {}
        const defaultBusyParam = defaultConfig[key]
        const busyKeys = Object.keys(defaultBusyParam)
        busyKeys.forEach((busyKey) => {
          keyStack.push(busyKey)
          switch (busyKey) {
            case 'maxLagPerRequest':
              delete busyParam[busyKey]
              break
            case 'lagCheckInterval':
              delete busyParam[busyKey]
              break
          }
          keyStack.pop(busyKey)
        })
        // Don't ignore extra params in the `toobusy` object
        break
      case 'bodyParser':
        const bodyParserParam = userConfig[key] || {}
        const defaultBodyParserParam = defaultConfig[key]
        const bodyParserKeys = Object.keys(defaultBodyParserParam)
        bodyParserKeys.forEach((bodyParserKey) => {
          keyStack.push(bodyParserKey)
          switch (bodyParserKey) {
            case 'urlEncoded':
              delete bodyParserParam[bodyParserKey]
              break
            case 'json':
              delete bodyParserParam[bodyParserKey]
              break
          }
          keyStack.pop(bodyParserKey)
        })
        // Don't ignore extra params in the `bodyParser` object
        break
      case 'frontendReload':
        const reloadParam = userConfig[key] || {}
        const defaultReloadParam = defaultConfig[key]
        const reloadKeys = Object.keys(defaultReloadParam)
        reloadKeys.forEach((reloadKey) => {
          keyStack.push(reloadKey)
          switch (reloadKey) {
            case 'enable':
              checkMissing(reloadParam, reloadKey, keyStack)
              delete reloadParam[reloadKey]
              break
            case 'port':
              delete reloadParam[reloadKey]
              break
            case 'httpsPort':
              delete reloadParam[reloadKey]
              break
            case 'verbose':
              delete reloadParam[reloadKey]
              break
          }
          keyStack.pop(reloadKey)
        })
        // Don't ignore extra params in the `frontendReload` object
        break
      case 'checkDependencies':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'cores':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'shutdownTimeout':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'cleanTimer':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'https':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'modelsPath':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'viewsPath':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'viewEngine':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'controllersPath':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'errorPages':
        const errorPagesParam = userConfig[key] || {}
        const defaultErrorPagesParam = defaultConfig[key]
        const errorPagesKeys = Object.keys(defaultErrorPagesParam)
        errorPagesKeys.forEach((errorPagesKey) => {
          keyStack.push(errorPagesKey)
          switch (errorPagesKey) {
            case 'notFound':
              delete errorPagesParam[errorPagesKey]
              break
            case 'internalServerError':
              delete errorPagesParam[errorPagesKey]
              break
            case 'serviceUnavailable':
              delete errorPagesParam[errorPagesKey]
              break
          }
          keyStack.pop(errorPagesKey)
        })
        // Don't ignore extra params in the `errorPages` object
        break
      case 'staticsRoot':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'htmlMinifier':
        const htmlMinParam = userConfig[key] || {}
        const defaultHtmlMinParam = defaultConfig[key]
        const htmlMinKeys = Object.keys(defaultHtmlMinParam)
        htmlMinKeys.forEach((htmlMinKey) => {
          keyStack.push(htmlMinKey)
          switch (htmlMinKey) {
            case 'enable':
              checkMissing(htmlMinParam, htmlMinKey, keyStack)
              delete htmlMinParam[htmlMinKey]
              break
            case 'exceptionRoutes':
              checkMissing(htmlMinParam, htmlMinKey, keyStack)
              delete htmlMinParam[htmlMinKey]
              break
            case 'options':
              delete htmlMinParam[htmlMinKey]
              break
          }
          keyStack.pop(htmlMinKey)
        })
        // Don't ignore extra params in the `htmlMinifier` object
        break
      case 'css':
        const cssParam = userConfig[key] || {}
        const defaultCssParam = defaultConfig[key]
        const cssKeys = Object.keys(defaultCssParam)
        cssKeys.forEach((cssKey) => {
          keyStack.push(cssKey)
          switch (cssKey) {
            case 'sourcePath':
              delete cssParam[cssKey]
              break
            case 'compiler':
              delete cssParam[cssKey]
              break
            case 'whitelist':
              checkMissing(cssParam, cssKey, keyStack)
              delete cssParam[cssKey]
              break
            case 'output':
              delete cssParam[cssKey]
              break
            case 'symlinkToPublic':
              delete cssParam[cssKey]
              break
            case 'versionFile':
              delete cssParam[cssKey]
              break
          }
          keyStack.pop(cssKey)
        })
        // Don't ignore extra params in the `css` object
        break
      case 'js':
        const jsParam = userConfig[key] || {}
        const defaultJsParam = defaultConfig[key]
        const jsKeys = Object.keys(defaultJsParam)
        jsKeys.forEach((jsKey) => {
          keyStack.push(jsKey)
          switch (jsKey) {
            case 'sourcePath':
              delete jsParam[jsKey]
              break
            case 'compiler':
              checkMissing(jsParam, jsKey, keyStack)
              delete jsParam[jsKey]
              break
            case 'whitelist':
              checkMissing(jsParam, jsKey, keyStack)
              delete jsParam[jsKey]
              break
            case 'blacklist':
              delete jsParam[jsKey]
              break
            case 'output':
              delete jsParam[jsKey]
              break
            case 'symlinkToPublic':
              delete jsParam[jsKey]
              break
            case 'bundler':
              const bundlerParam = jsParam[jsKey] || {}
              const defaultBundlerParam = defaultJsParam[jsKey]
              const bundlerKeys = Object.keys(defaultBundlerParam)
              bundlerKeys.forEach((bundlerKey) => {
                keyStack.push(bundlerKey)
                switch (bundlerKey) {
                  case 'bundles':
                    delete bundlerParam[bundlerKey]
                    break
                  case 'output':
                    checkMissing(bundlerParam, bundlerKey, keyStack)
                    delete bundlerParam[bundlerKey]
                    break
                  case 'expose':
                    delete bundlerParam[bundlerKey]
                    break
                }
                keyStack.pop(bundlerKey)
              })
              // Don't ignore extra params in the `bundler` object
              break
          }
          keyStack.pop(jsKey)
        })
        // Don't ignore extra params in the `js` object
        break
      case 'publicFolder':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'favicon':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'staticsSymlinksToPublic':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'versionedPublic':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'alwaysHostPublic':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
      case 'routers':
        checkMissing(userConfig, key, keyStack)
        delete userConfig[key]
        break
    }
    keyStack.pop(key)
  })

  /**
   * Recursive function that checks for extra params and lets the user know where to find them
   *
   * @param userConfigParam - extra params in the userConfig
   * @param defaultConfigParam - object in the defaultConfig at the key specified in the userConfigParam
   * @param jsonPath - string containing the path to the extra param
   */
  function checkExtraParams (userConfigParam, defaultConfigParam, jsonPath) {
    const params = Object.entries(userConfigParam)
    params.map(([key, val]) => {
      // Check if param in config is an object. If so, there is another layer of params to examine
      if (val instanceof Object && !(Array.isArray(val)) && val !== null && defaultConfigParam[key] !== undefined) {
        checkExtraParams(val, defaultConfigParam[key], jsonPath + '.' + key)
      } else {
        logger.error('⚠️', ` Extra param "${key}" found at ${jsonPath + '.' + key}, this can be removed.`.bold)
        errors = true
      }
    })
  }

  // check for extra params in userConfig
  checkExtraParams(userConfig, defaultConfig, 'rooseveltConfig')

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

  // check dependencies
  const checkDeps = require('check-dependencies').sync({ packageDir: appDir })
  if (checkDeps.depsWereOk === false) {
    for (var i = 0; i < checkDeps.error.length; i++) {
      logger.error('⚠️', ` Missing Dependency: ${checkDeps.error[i]}`.bold)
    }
  }

  if (errors) {
    logger.error('Issues have been detected in rooseveltConfig, please consult https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for details on each param.'.bold)
    logger.error('Or see https://github.com/rooseveltframework/roosevelt/blob/master/lib/defaults/config.json for the latest sample rooseveltConfig.'.bold)
  } else {
    logger.info('✅', 'rooseveltConfig audit completed with no errors found.'.green)
  }
}
