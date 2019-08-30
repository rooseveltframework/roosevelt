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
  const checkParamObject = require('../tools/checkParamObject')
  const defaultConfig = require('../defaults/config')
  const defaultConfigKeys = Object.keys(defaultConfig)
  const defaultScripts = require('../defaults/scripts')
  const defaultScriptKeys = Object.keys(defaultScripts)
  let pkg
  let defaultParam
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

    userConfig = pkg.rooseveltConfig
    userConfigKeys = Object.keys(userConfig)
    userScripts = pkg.scripts || {}
  } catch (e) {
    return
  }

  logger.info('📋', 'Starting rooseveltConfig audit...')

  // inspect for missing params
  defaultConfigKeys.forEach((key) => {
    defaultParam = defaultConfig[key]
    if (userConfig[key] === undefined) {
      if (key === 'port') {
        logger.warn('Missing port param'.bold)
      } else {
        logger.error('⚠️', ` Missing param "${key}"!`.bold)
        errors = true
      }
    } else if (defaultParam instanceof Object && !(Array.isArray(defaultParam)) && Object.keys(defaultParam).length > 0 && defaultParam !== null) {
      if (checkParamObject(userConfig[key], defaultParam, key)) {
        errors = true
      }
    }
  })

  // inspect for extra params
  userConfigKeys.forEach((userParam) => {
    if (defaultConfig[userParam] === undefined) {
      logger.error('⚠️', ` Extra param "${userParam}" found, this can be removed.`.bold)
      errors = true
    }
  })

  // inspect for missing or outdated scripts
  const startScripts = {
    production: ['start', 'production', 'prod', 'p'],
    development: ['development', 'dev', 'd']
  }
  let hasProdScript = false
  let hasDevScript = false
  defaultScriptKeys.forEach((defaultScript) => {
    Object.keys(userScripts).forEach((userScript) => {
      if (startScripts.production.includes(userScript) === true) {
        hasProdScript = true
      }
      if (startScripts.development.includes(userScript) === true) {
        hasDevScript = true
      }
    })
    if (userScripts[defaultScript] === undefined) {
      if (defaultScripts[defaultScript].priority === 'error') {
        logger.error('⚠️', ` Missing script "${defaultScript}"!`.bold)
        errors = true
      } else if (defaultScripts[defaultScript].priority === 'warning') {
        logger.warn(`Missing recommended script "${defaultScript}"!`.bold)
        errors = true
      }
    } else if (defaultScripts[defaultScript].inspect === true) {
      if (userScripts[defaultScript].includes('roosevelt') && userScripts[defaultScript] !== defaultScripts[defaultScript].value) {
        logger.error('⚠️', ` Detected outdated script "${defaultScript}". Update contents to "${defaultScripts[defaultScript].value}" to restore functionality.`.bold)
        errors = true
      }
    }
  })

  // output warning for missing start script
  if (!hasProdScript) {
    logger.warn('Missing production run script(s).'.bold)
    errors = true
  }
  if (!hasDevScript) {
    logger.warn('Missing development run script(s).'.bold)
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
