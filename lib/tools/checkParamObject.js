// Utility module for validating Roosevelt param objects
const logger = require('./logger')()

module.exports = function (userParam, defaultParam, auditKey) {
  let defaultKeys = Object.keys(defaultParam)
  let userKeys = Object.keys(userParam)
  let defaultProp

  if (auditKey) {
    userKeys.forEach((key) => {
      if (defaultParam[key] === undefined) {
        logger.error('⚠️', `Extra param "${key}" found in "${auditKey}", this can be removed.`.red.bold)
      }
    })
  }

  defaultKeys.forEach((key) => {
    defaultProp = defaultParam[key]
    if (userParam[key] === undefined) {
      if (auditKey) {
        logger.error('⚠️', `Missing param "${key}" in "${auditKey}"!`.red.bold)
      } else {
        userParam[key] = defaultProp
      }
    } else if (defaultProp instanceof Object && !(Array.isArray(defaultProp)) && Object.keys(defaultProp).length > 0 && defaultProp !== null) {
      module.exports(userParam[key], defaultProp, auditKey ? key : undefined)
    }
  })
}
