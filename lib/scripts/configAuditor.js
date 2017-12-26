// check user config against default roosevelt configuration

require('colors')

if (module.parent) {
  module.exports = configAudit()
} else {
  configAudit()
}

function configAudit (app) {
  const path = require('path')
  const logger = require('../tools/logger')()
  const checkParamObject = require('../tools/checkParamObject')
  const defaultConfig = require('../defaults/config')
  const defaultConfigKeys = Object.keys(defaultConfig)
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let appDir
  let defaultParam
  let userConfig
  let userConfigKeys
  let userScripts
  let errors

  if (app) {
    appDir = app.get('appDir')
  } else {
    appDir = process.cwd()
  }

  try {
    // if package or rooseveltConfig cannot be found (e.g., script triggered without app present), skip audit
    pkg = require(path.join(appDir, 'package.json'))

    if (!pkg.rooseveltConfig) {
      throw new Error('rooseveltConfig not found!')
    }

    userConfig = pkg.rooseveltConfig
    userConfigKeys = Object.keys(userConfig)
    userScripts = pkg.scripts || {}
  } catch (e) {
    return
  }

  logger.log('📋', 'Starting roosevelt user configuration audit...'.bold)

  defaultConfigKeys.forEach(function (key) {
    defaultParam = defaultConfig[key]

    if (!(defaultParam.optional) && defaultParam.audit !== false) {
      if (userConfig[key] === undefined) {
        logger.error('⚠️', `Missing param ${key}!`.red.bold)
        errors = true
      } else if (defaultParam.value instanceof Object && !(Array.isArray(defaultParam.value)) && Object.keys(defaultParam.value).length > 0 && defaultParam.value !== null) {
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
}
