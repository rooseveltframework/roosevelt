// check user config against default roosevelt configuration

const logger = require('./logger')()

require('colors');

(function configAudit () {
  const path = require('path')
  const appDir = require('./getAppDir')
  const checkParamObject = require('./checkParamObject')
  const defaultConfig = require('./defaultConfig.json')
  const defaultConfigKeys = Object.keys(defaultConfig)
  const defaultScripts = require('./defaultScripts.json')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let defaultParam
  let userConfig
  let userConfigKeys
  let userScripts
  let errors

  try {
    // if package cannot be found (e.g., script triggered without app present), skip audit
    pkg = require(path.join(appDir, 'package.json'))
    userConfig = pkg.rooseveltConfig || {}
    userConfigKeys = Object.keys(userConfig)
    userScripts = pkg.scripts || {}
  } catch (e) {
    return
  }

  logger.log('📋', 'Starting roosevelt user configuration audit...'.bold)

  defaultConfigKeys.forEach(function (key) {
    defaultParam = defaultConfig[key]

    if (!defaultParam.optional) {
      if (userConfig[key] === undefined) {
        console.error('⚠️', `Missing param ${key}!`.red.bold)
        errors = true
      } else if (defaultParam.value !== (undefined || []) && defaultParam.value instanceof Object) {
        if (checkParamObject(userConfig[key], defaultParam, 'audit')) {
          errors = true
        }
      }
    }
  })

  userConfigKeys.forEach(function (userParam) {
    if (defaultConfig[userParam] === undefined) {
      logger.error('⚠️', `Extra param ${userParam} found, this can be removed.`.red.bold)
      errors = true
    }
  })

  defaultScriptKeys.forEach(function (defaultScript) {
    if (userScripts[defaultScript] === undefined) {
      if (defaultScripts[defaultScript].priority === 'error') {
        logger.error('⚠️', `Missing script ${defaultScript}!`.red.bold)
        errors = true
      } else if (defaultScripts[defaultScript].priority === 'warning') {
        logger.warn(`Missing recommended script ${defaultScript}!`.yellow.bold)
      }
    }
  })

  if (errors) {
    logger.error('Issues have been detected in roosevelt config, please consult https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for details on each param.'.bold.red)
  } else {
    logger.log('✔️', 'Configuration audit completed with no errors found.')
  }
})()
