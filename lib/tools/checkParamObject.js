// Utility module for validating Roosevelt param objects
const logger = require('./logger')()

module.exports = function (userParam, defaultParam, auditKey) {
  let defaultKeys = Object.keys(defaultParam)
  let userKeys = Object.keys(userParam)
  let defaultProp
  let extraOrMissingkeysBool = false

  if (auditKey) {
    userKeys.forEach((key) => {
      if (defaultParam[key] === undefined && auditKey !== 'logging') {
        logger.error('⚠️', ` Extra param "${key}" found in "${auditKey}", this can be removed.`.red.bold)
        extraOrMissingkeysBool = true
      }
    })
  }

  defaultKeys.forEach((key) => {
    defaultProp = defaultParam[key]
    if (userParam[key] === undefined) {
      if (auditKey) {
        logger.error('⚠️', ` Missing param "${key}" in "${auditKey}"!`.red.bold)
        extraOrMissingkeysBool = true
      } else {
        userParam[key] = defaultProp
      }
    } else if (defaultProp instanceof Object && !(Array.isArray(defaultProp)) && Object.keys(defaultProp).length > 0 && defaultProp !== null) {
      module.exports(userParam[key], defaultProp, auditKey ? key : undefined)
    }
  })
  return extraOrMissingkeysBool
}
