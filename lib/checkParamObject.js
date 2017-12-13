// Utility module for validating Roosevelt param objects
const logger = require('./logger')()

module.exports = function (userParam, defaultParam, mode) {
  if (typeof userParam !== 'object' || userParam === null) {
    return
  }

  let userKeys = Object.keys(userParam)
  let defaultParamValue = defaultParam.value
  let defaultKeys = Object.keys(defaultParamValue)
  let defaultProp

  if (mode === 'setDefault') {
    defaultKeys.forEach((key) => {
      defaultProp = defaultParamValue[key]

      if (!defaultProp.optional) {
        if (defaultProp.value instanceof Object && !(Array.isArray(defaultProp.value)) && Object.keys(defaultProp.value).length > 0 && defaultProp.value !== null) {
          module.exports(userParam[key].value, defaultProp, mode)
        } else {
          userParam[key] = defaultProp.value
        }
      } else {
        delete userParam[key]
      }
    })
  } else {
    if (userKeys.length < defaultKeys.length) {
      defaultKeys.forEach((key) => {
        defaultProp = defaultParamValue[key]

        if (!defaultProp.optional) {
          if (!(key in userParam)) {
            if (mode === 'audit') {
              logger.error('⚠️', `Missing param ${key} in ${defaultProp.parent}!`.red.bold)
            } else if (defaultProp.value instanceof Object && !(Array.isArray(defaultProp.value)) && Object.keys(defaultProp.value).length > 0 && defaultProp.value !== (null || undefined)) {
              module.exports(userParam[key], defaultProp, mode)
            } else {
              userParam[key] = defaultProp.value
            }
          }
        }
      })
    }
  }
}
