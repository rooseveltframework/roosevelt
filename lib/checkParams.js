// Utility module for validating Roosevelt params

const checkParamObject = require('./checkParamObject')

module.exports = function () {
  const defaultParam = arguments[arguments.length - 1].value
  let i
  let value

  for (i in arguments) {
    if (arguments[i] !== undefined) {
      if (value !== undefined) {
        if (defaultParam !== (undefined || []) && defaultParam instanceof Object) {
          checkParamObject(value, defaultParam)
        } else {
          return value
        }
      } else {
        value = arguments[i]
      }
    }
  }
  return value
}
