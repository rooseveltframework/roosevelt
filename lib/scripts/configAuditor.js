// check user config against default roosevelt configuration

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
  const logger = require('../tools/logger')()
  const checkParamObject = require('../tools/checkParamObject')
  const defaultConfig = require('../defaults/config')
  const defaultConfigKeys = Object.keys(defaultConfig)
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  appDir = appDir || process.env.INIT_CWD
  let defaultParam
  let userConfig
  let userConfigKeys
  let userScripts
  let errors

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

  // inspect for missing params
  defaultConfigKeys.forEach((key) => {
    defaultParam = defaultConfig[key]
    if (userConfig[key] === undefined) {
      logger.error('⚠️', `Missing param "${key}"!`.red.bold)
      errors = true
    } else if (defaultParam instanceof Object && !(Array.isArray(defaultParam)) && Object.keys(defaultParam).length > 0 && defaultParam !== null) {
      if (checkParamObject(userConfig[key], defaultParam, key)) {
        errors = true
      }
    }
  })

  // inspect for extra params
  userConfigKeys.forEach((userParam) => {
    if (defaultConfig[userParam] === undefined) {
      logger.error('⚠️', `Extra param "${userParam}" found, this can be removed.`.red.bold)
      errors = true
    }
  })

  // inspect for missing or outdated scripts
  defaultScriptKeys.forEach((defaultScript) => {
    if (userScripts[defaultScript] === undefined) {
      if (defaultScripts[defaultScript].priority === 'error') {
        logger.error('⚠️', `Missing script "${defaultScript}"!`.red.bold)
        errors = true
      } else if (defaultScripts[defaultScript].priority === 'warning') {
        logger.warn(`Missing recommended script "${defaultScript}"!`.bold)
      }
    } else if (defaultScripts[defaultScript].inspect === true) {
      if (userScripts[defaultScript].includes('roosevelt') && userScripts[defaultScript] !== defaultScripts[defaultScript].value) {
        logger.error('⚠️', `Detected outdated script "${defaultScript}". Update contents to "${defaultScripts[defaultScript].value}" to restore functionality.`.red.bold)
      }
    }
  })

  if (errors) {
    logger.error('Issues have been detected in roosevelt config, please consult https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for details on each param.'.red.bold)
    logger.error('Or see https://github.com/rooseveltframework/roosevelt/blob/master/lib/defaults/config.json for the latest sample rooseveltConfig.'.red.bold)
  } else {
    logger.log('✔️', 'Configuration audit completed with no errors found.')
  }
}
