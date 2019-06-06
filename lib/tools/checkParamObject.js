// Utility module for validating Roosevelt param objects
const Logger = require('roosevelt-logger')
const logger = new Logger()

module.exports = function (userParam, defaultParam, auditKey) {
  let defaultKeys = Object.keys(defaultParam)
  let userKeys = Object.keys(userParam)
  let defaultProp
  let extraOrMissingkeysBool = false

  if (auditKey && defaultParam['_roosevelt-extra-exempt'] !== true) {
    userKeys.forEach((key) => {
      if (defaultParam[key] === undefined) {
        logger.error('⚠️', ` Extra param "${key}" found in "${auditKey}", this can be removed.`.bold)
        extraOrMissingkeysBool = true
      }
    })
  }

  if (defaultParam['_roosevelt-missing-exempt'] !== true) {
    defaultKeys.forEach((key) => {
      defaultProp = defaultParam[key]
      if (userParam[key] === undefined && key !== '_roosevelt-extra-exempt') {
        if (auditKey) {
          logger.error('⚠️', ` Missing param "${key}" in "${auditKey}"!`.bold)
          extraOrMissingkeysBool = true
        } else {
          userParam[key] = defaultProp
        }
      } else if (defaultProp instanceof Object && !(Array.isArray(defaultProp)) && Object.keys(defaultProp).length > 0 && defaultProp !== null) {
        module.exports(userParam[key], defaultProp, auditKey ? key : undefined)
      }
    })
  }
  return extraOrMissingkeysBool
}
