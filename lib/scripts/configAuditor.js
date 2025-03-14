// check user config against default roosevelt configuration
const fs = require('fs-extra')
require('@colors/colors')

if (module.parent) {
  module.exports = {
    audit: configAudit
  }
} else {
  configAudit()
}

async function configAudit (appDir) {
  const path = require('path')
  const Logger = require('roosevelt-logger')
  const logger = new Logger()
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let cfg
  let errors
  let processEnv
  if (!appDir) {
    if (fs.pathExistsSync(path.join(process.cwd(), 'node_modules')) === false) {
      processEnv = process.cwd()
    } else {
      processEnv = undefined
    }
    appDir = processEnv
  }

  try {
    // check for existence of package.json and rooseveltConfig within
    pkg = require(path.join(appDir, 'package.json'))
    if (!pkg.rooseveltConfig) {
      throw new Error('rooseveltConfig not found!')
    }
  } catch {
    pkg = {}
  }

  try {
    // check for existence of rooseveltConfig.json or roosevelt.config.json
    if (fs.existsSync(path.join(appDir, 'rooseveltConfig.json'))) cfg = require(path.join(appDir, 'rooseveltConfig.json'))
    else if (fs.existsSync(path.join(appDir, 'roosevelt.config.json'))) cfg = require(path.join(appDir, 'roosevelt.config.json'))
  } catch (e) {
    // skip audit if package config was also not found
    if (!pkg.rooseveltConfig) {
      return
    }
  }

  logger.info('📋', 'Starting rooseveltConfig audit...')

  if (cfg) {
    logger.info('📋', 'Scanning rooseveltConfig.json...')

    // audit config file if it exists
    audit(cfg, 'file')
  }

  if (pkg.rooseveltConfig) {
    logger.info('📋', 'Scanning package.json...')

    // audit package.json if it exists
    audit(pkg, 'package')
  }

  /**
   * Audit a given Roosevelt config
   * @param {object} config - configuration object to test
   * @param {string} source - source of configuration (package/config file)
   */
  function audit (config, source) {
    let userConfig
    let userConfigKeys
    let userScripts

    // make deep copies of configuration object
    if (source === 'package') {
      userConfig = JSON.parse(JSON.stringify(config.rooseveltConfig))
      userConfigKeys = Object.keys(userConfig)
      userScripts = config.scripts || {}
    } else if (source === 'file') {
      userConfig = JSON.parse(JSON.stringify(config))
      userConfigKeys = Object.keys(userConfig)
    }

    /**
     * To check for extra params, call `foundExtra()` in the default case
     * Auditing an object requires a `switch`, cases for each param, and to push/pop from `keyStack`
     * Check types by calling `checkTypes` and passing it a list of possible types it should be
    */
    const keyStack = []
    for (const key of userConfigKeys) {
      const userParam = userConfig[key]

      keyStack.push(key)
      switch (key) {
        case 'hostPublic':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'clientViews': {
          checkTypes(userParam, key, ['object'])
          const clientViewParam = userParam || {}
          for (const clientViewKey of Object.keys(clientViewParam)) {
            keyStack.push(clientViewKey)
            switch (clientViewKey) {
              case 'allowlist':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['null', 'object'])
                break
              case 'blocklist':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['null', 'object'])
                break
              case 'output':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['string'])
                break
              case 'minify':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['boolean'])
                break
              case 'minifyOptions':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['null', 'object'])
                break
              case 'exposeAll':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['boolean'])
                break
              case 'defaultBundle':
                checkTypes(clientViewParam[clientViewKey], clientViewKey, ['string'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(clientViewKey)
          }
          break
        }
        case 'clientControllers': {
          checkTypes(userParam, key, ['object'])
          const clientControllerParam = userParam || {}
          for (const clientControllerKey of Object.keys(clientControllerParam)) {
            keyStack.push(clientControllerKey)
            switch (clientControllerKey) {
              case 'allowlist':
                checkTypes(clientControllerParam[clientControllerKey], clientControllerKey, ['null', 'object'])
                break
              case 'blocklist':
                checkTypes(clientControllerParam[clientControllerKey], clientControllerKey, ['null', 'object'])
                break
              case 'output':
                checkTypes(clientControllerParam[clientControllerKey], clientControllerKey, ['string'])
                break
              case 'exposeAll':
                checkTypes(clientControllerParam[clientControllerKey], clientControllerKey, ['boolean'])
                break
              case 'defaultBundle':
                checkTypes(clientControllerParam[clientControllerKey], clientControllerKey, ['string'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(clientControllerKey)
          }
          break
        }
        case 'controllersPath':
          checkTypes(userParam, key, ['string'])
          break
        case 'enableCLIFlags':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'favicon':
          checkTypes(userParam, key, ['null', 'string'])
          break
        case 'makeBuildArtifacts':
          checkTypes(userParam, key, ['boolean', 'string'])
          break
        case 'http': {
          checkTypes(userParam, key, ['boolean', 'object'])
          const httpParam = userParam || {}
          for (const httpKey of Object.keys(httpParam)) {
            keyStack.push(httpKey)
            switch (httpKey) {
              case 'enable':
                checkTypes(httpParam[httpKey], httpKey, ['boolean'])
                break
              case 'port':
                checkTypes(httpParam[httpKey], httpKey, ['string', 'number'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(httpKey)
          }
          break
        }
        case 'https': {
          checkTypes(userParam, key, ['boolean', 'object'])
          const httpsParam = userParam || {}
          for (const httpsKey of Object.keys(httpsParam)) {
            keyStack.push(httpsKey)
            switch (httpsKey) {
              case 'enable':
                checkTypes(httpsParam[httpsKey], httpsKey, ['boolean'])
                break
              case 'autoCert':
                checkTypes(httpsParam[httpsKey], httpsKey, ['boolean'])
                break
              case 'port':
                checkTypes(httpsParam[httpsKey], httpsKey, ['string', 'number'])
                break
              case 'options':
                checkTypes(httpsParam[httpsKey], httpsKey, ['null', 'object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(httpsKey)
          }
          break
        }
        case 'localhostOnly':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'minify':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'mode':
          checkTypes(userParam, key, ['string'])
          break
        case 'modelsPath':
          checkTypes(userParam, key, ['string'])
          break
        case 'secretsPath':
          checkTypes(userParam, key, ['string'])
          break
        case 'formidable':
          checkTypes(userParam, key, ['boolean', 'object'])
          break
        case 'publicFolder':
          checkTypes(userParam, key, ['string'])
          break
        case 'routePrefix':
          checkTypes(userParam, key, ['null', 'string'])
          break
        case 'shutdownTimeout':
          checkTypes(userParam, key, ['number'])
          break
        case 'staticsRoot':
          checkTypes(userParam, key, ['string'])
          break
        case 'symlinks':
          checkTypes(userParam, key, ['array'])
          break
        case 'prodSourceMaps':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'versionedPublic':
          checkTypes(userParam, key, ['boolean'])
          break
        case 'viewEngine':
          checkTypes(userParam, key, ['array', 'null', 'string'])
          break
        case 'viewsPath':
          checkTypes(userParam, key, ['string'])
          break
        case 'preprocessedViewsPath':
          checkTypes(userParam, key, ['boolean', 'string'])
          break
        case 'preprocessedStaticsPath':
          checkTypes(userParam, key, ['boolean', 'string'])
          break
        case 'helmet':
          checkTypes(userParam, key, ['object'])
          break
        case 'csrfProtection':
          checkTypes(userParam, key, ['boolean', 'object'])
          break
        case 'expressSessionStore':
          checkTypes(userParam, key, ['object'])
          break
        case 'expressSession':
          checkTypes(userParam, key, ['boolean', 'object'])
          break
        case 'bodyParser': {
          checkTypes(userParam, key, ['object'])
          const bodyParserParam = userParam || {}
          for (const bodyParserKey of Object.keys(bodyParserParam)) {
            keyStack.push(bodyParserKey)
            switch (bodyParserKey) {
              case 'urlEncoded':
                checkTypes(bodyParserParam[bodyParserKey], bodyParserKey, ['object'])
                break
              case 'json':
                checkTypes(bodyParserParam[bodyParserKey], bodyParserKey, ['object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(bodyParserKey)
          }
          break
        }
        case 'html': {
          checkTypes(userParam, key, ['object'])
          const htmlParam = userParam || {}
          for (const htmlKey of Object.keys(htmlParam)) {
            keyStack.push(htmlKey)
            switch (htmlKey) {
              case 'sourcePath':
                checkTypes(htmlParam[htmlKey], htmlKey, ['string'])
                break
              case 'allowlist':
                checkTypes(htmlParam[htmlKey], htmlKey, ['null', 'array'])
                break
              case 'blocklist':
                checkTypes(htmlParam[htmlKey], htmlKey, ['null', 'array'])
                break
              case 'models':
                checkTypes(htmlParam[htmlKey], htmlKey, ['object'])
                break
              case 'output':
                checkTypes(htmlParam[htmlKey], htmlKey, ['string', 'null'])
                break
              case 'minifier': {
                checkTypes(htmlParam[htmlKey], htmlKey, ['object'])
                const htmlMinParam = htmlParam[htmlKey] || {}
                for (const htmlMinKey of Object.keys(htmlMinParam)) {
                  keyStack.push(htmlMinKey)
                  switch (htmlMinKey) {
                    case 'enable':
                      checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['boolean'])
                      break
                    case 'exceptionRoutes':
                      checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['array', 'boolean', 'string'])
                      break
                    case 'options':
                      checkTypes(htmlMinParam[htmlMinKey], htmlMinKey, ['object'])
                      break
                    default:
                      foundExtra(['rooseveltConfig', ...keyStack])
                  }
                  keyStack.pop(htmlMinKey)
                }
                break
              }
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(htmlKey)
          }
          break
        }
        case 'css': {
          checkTypes(userParam, key, ['object'])
          const cssParam = userParam || {}
          for (const cssKey of Object.keys(cssParam)) {
            keyStack.push(cssKey)
            switch (cssKey) {
              case 'sourcePath':
                checkTypes(cssParam[cssKey], cssKey, ['string'])
                break
              case 'compiler': {
                checkTypes(cssParam[cssKey], cssKey, ['null', 'object', 'string'])
                const cssCompilerParam = cssParam[cssKey] || {}
                for (const cssCompilerKey of Object.keys(cssCompilerParam)) {
                  keyStack.push(cssCompilerKey)
                  switch (cssCompilerKey) {
                    case 'enable':
                      checkTypes(cssCompilerParam[cssCompilerKey], cssCompilerKey, ['boolean'])
                      break
                    case 'module':
                      checkTypes(cssCompilerParam[cssCompilerKey], cssCompilerKey, ['string'])
                      break
                    case 'options':
                      checkTypes(cssCompilerParam[cssCompilerKey], cssCompilerKey, ['object', 'null'])
                      break
                    default:
                      foundExtra(['rooseveltConfig', ...keyStack])
                  }
                  keyStack.pop(cssCompilerKey)
                }
                break
              }
              case 'minifier': {
                checkTypes(cssParam[cssKey], cssKey, ['null', 'object'])
                const cssMinifierParam = cssParam[cssKey] || {}
                for (const minifierKey of Object.keys(cssMinifierParam)) {
                  keyStack.push(minifierKey)
                  switch (minifierKey) {
                    case 'enable':
                      checkTypes(cssMinifierParam[minifierKey], minifierKey, ['boolean'])
                      break
                    case 'options':
                      checkTypes(cssMinifierParam[minifierKey], minifierKey, ['object', 'null'])
                      break
                    default:
                      foundExtra(['rooseveltConfig', ...keyStack])
                  }
                  keyStack.pop(minifierKey)
                }
                break
              }
              case 'allowlist':
                checkTypes(cssParam[cssKey], cssKey, ['array', 'null'])
                break
              case 'output':
                checkTypes(cssParam[cssKey], cssKey, ['string'])
                break
              case 'versionFile':
                checkTypes(cssParam[cssKey], cssKey, ['null', 'object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(cssKey)
          }
          break
        }
        case 'errorPages': {
          checkTypes(userParam, key, ['object'])
          const errorPagesParam = userParam || {}
          for (const errorPagesKey of Object.keys(errorPagesParam)) {
            keyStack.push(errorPagesKey)
            switch (errorPagesKey) {
              case 'notFound':
                checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
                break
              case 'forbidden':
                checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
                break
              case 'internalServerError':
                checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
                break
              case 'serviceUnavailable':
                checkTypes(errorPagesParam[errorPagesKey], errorPagesKey, ['string'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(errorPagesKey)
          }
          break
        }
        case 'frontendReload': {
          checkTypes(userParam, key, ['object'])
          const reloadParam = userParam || {}
          for (const reloadKey of Object.keys(reloadParam)) {
            keyStack.push(reloadKey)
            switch (reloadKey) {
              case 'enable':
                checkTypes(reloadParam[reloadKey], reloadKey, ['boolean'])
                break
              case 'exceptionRoutes':
                checkTypes(reloadParam[reloadKey], reloadKey, ['array'])
                break
              case 'expressBrowserReloadParams':
                checkTypes(reloadParam[reloadKey], reloadKey, ['object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(reloadKey)
          }
          break
        }
        case 'minifyHtmlAttributes': {
          checkTypes(userParam, key, ['object'])
          const minifyHtmlAttributesParam = userParam || {}
          for (const minifyHtmlAttributesKey of Object.keys(minifyHtmlAttributesParam)) {
            keyStack.push(minifyHtmlAttributesKey)
            switch (minifyHtmlAttributesKey) {
              case 'enable':
                checkTypes(minifyHtmlAttributesParam[minifyHtmlAttributesKey], minifyHtmlAttributesKey, ['boolean'])
                break
              case 'minifyHtmlAttributesParams':
                checkTypes(minifyHtmlAttributesParam[minifyHtmlAttributesKey], minifyHtmlAttributesKey, ['object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(minifyHtmlAttributesKey)
          }
          break
        }
        case 'htmlValidator': {
          checkTypes(userParam, key, ['object'])
          const validatorParam = userParam || {}
          for (const validatorKey of Object.keys(validatorParam)) {
            keyStack.push(validatorKey)
            switch (validatorKey) {
              case 'enable':
                checkTypes(validatorParam[validatorKey], validatorKey, ['boolean'])
                break
              case 'exceptions': {
                checkTypes(validatorParam[validatorKey], validatorKey, ['object'])
                break
              }
              case 'validatorConfig':
                checkTypes(validatorParam[validatorKey], validatorKey, ['object'])
                break
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(validatorKey)
          }
          break
        }
        case 'logging': {
          checkTypes(userParam, key, ['object'])
          const loggingParam = userParam || {}
          for (const loggingKey of Object.keys(loggingParam)) {
            keyStack.push(loggingKey)
            switch (loggingKey) {
              case 'methods': {
                checkTypes(loggingParam[loggingKey], loggingKey, ['object'])
                const methodsParam = loggingParam[loggingKey] || {}
                for (const methodsKey of Object.keys(methodsParam)) {
                  keyStack.push(methodsKey)
                  switch (methodsKey) {
                    case 'http':
                      checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                      break
                    case 'info':
                      checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                      break
                    case 'warn':
                      checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                      break
                    case 'error':
                      checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                      break
                    case 'verbose':
                      checkTypes(methodsParam[methodsKey], methodsKey, ['boolean'])
                      break
                    default:
                    // ignore extra custom log types in the methods object
                  }
                  keyStack.pop(methodsKey)
                }
                break
              }
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(loggingKey)
          }
          break
        }
        case 'js': {
          checkTypes(userParam, key, ['object'])
          const jsParam = userParam || {}
          for (const jsKey of Object.keys(jsParam)) {
            keyStack.push(jsKey)
            switch (jsKey) {
              case 'sourcePath':
                checkTypes(jsParam[jsKey], jsKey, ['string'])
                break
              case 'webpack': {
                checkTypes(jsParam[jsKey], jsKey, ['object'])
                const bundlerParam = jsParam[jsKey] || {}
                for (const bundlerKey of Object.keys(bundlerParam)) {
                  keyStack.push(bundlerKey)
                  switch (bundlerKey) {
                    case 'enable':
                      checkTypes(bundlerParam[bundlerKey], bundlerKey, ['boolean'])
                      break
                    case 'bundles':
                      checkTypes(bundlerParam[bundlerKey], bundlerKey, ['array'])
                      break
                    default:
                      foundExtra(['rooseveltConfig', ...keyStack])
                  }
                  keyStack.pop(bundlerKey)
                }
                break
              }
              default:
                foundExtra(['rooseveltConfig', ...keyStack])
            }
            keyStack.pop(jsKey)
          }
          break
        }
        default:
          foundExtra(['rooseveltConfig', ...keyStack])
      }
      keyStack.pop(key)
    }

    if (userScripts) {
      let hasProdScript = false
      let hasDevScript = false

      for (const script of defaultScriptKeys) {
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
          case 'audit-config':
            checkMissingScript(userScripts, script)
            checkOutdatedScript(userScripts, script)
            break
          case 'a':
            break
          case 'generate-certs':
            checkMissingScript(userScripts, script)
            checkOutdatedScript(userScripts, script)
            break
          case 'c':
            break
          case 'standard':
            break
          case 'stylelint':
            break
          case 'lint':
          case 'l':
            break
          case 'test':
            if (userScripts[script] === undefined) {
              logger.warn(` Missing recommended script "${script}"!`)
              errors = true
            }
            break
        }
      }

      // output warning for missing start script
      if (!hasProdScript) {
        logger.warn(' Missing production run script(s).')
        errors = true
      }
      if (!hasDevScript) {
        logger.warn(' Missing development run script(s).')
        errors = true
      }
    }

    if (errors) {
      logger.error('Issues have been detected in your Roosevelt config, please consult https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for details on each param.'.bold)
      logger.error('Or see https://github.com/rooseveltframework/roosevelt/blob/master/lib/defaults/config.json for the latest sample Roosevelt config.'.bold)
    } else {
      logger.info('✅', 'rooseveltConfig audit completed with no errors found.'.green)
    }

    // detect if roosevelt is being updated from a pre 0.16 version
    if (source === 'package' && pkg.rooseveltConfig.cleanTimer) {
      logger.error('Your Roosevelt config was created under an old version of Roosevelt. Because of breaking API changes you may need to remove previous build artifacts that were generated by the previous version of Roosevelt such as most commonly: statics/.build and statics/js/.bundled. You can remove this warning by upgrading your Roosevelt config to the latest version of Roosevelt. Be sure to update your nodemonConfig and .gitignore as well. See https://github.com/rooseveltframework/roosevelt/blob/master/lib/defaults/config.json for the latest default config.'.bold)
    }
  }

  /**
   * Logs an error to the console displaying info about the extra param that was found
   *
   * @param {Array} keyList - list of keys from the keyStack
   */
  function foundExtra (keyList) {
    logger.error('⚠️', ` Extra param "${keyList.pop()}" found in ${keyList.join('.')}, this can be removed.`)
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
        logger.error('⚠️', ` The type of param "${key}" should be one of the supported types: ${types.join(', ')}`)
        errors = true
      }
    }
  }

  /**
   * Checks user's scripts if the default script exists
   *
   * @param scripts - user's scripts
   * @param scriptKey - script key to access script from user's scripts
   */
  function checkMissingScript (scripts, scriptKey) {
    if (scripts[scriptKey] === undefined) {
      logger.error('⚠️', ` Missing script "${scriptKey}"!`)
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
        logger.error('⚠️', ` Detected outdated script "${scriptKey}". Update contents to "${defaultScripts[scriptKey].value}" to restore functionality.`)
        errors = true
      }
    }
  }
}
