// Utility module for validating Roosevelt params

const checkParamObject = require('./checkParamObject')

module.exports = function () {
  const args = arguments
  const defaultParam = args['2']
  let i
  let value

  for (i in args) {
    if (args[i] !== undefined) {
      if (value !== undefined) {
        if (defaultParam !== (undefined || []) && defaultParam instanceof Object) {
          checkParamObject(value, defaultParam)
        } else {
          return value
        }
      } else {
        value = args[i]
      }
    }
  }
  return value
}
