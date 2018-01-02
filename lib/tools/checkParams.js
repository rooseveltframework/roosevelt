// Utility module for validating Roosevelt params

const checkParamObject = require('./checkParamObject')

module.exports = function () {
  const defaultParam = arguments[arguments.length - 1]
  let paramSource
  let usingDefault
  let param
  let i

  for (i in arguments) {
    paramSource = arguments[i]

    if (paramSource !== undefined) {
      if (paramSource === defaultParam && param === undefined) {
        usingDefault = true
        param = paramSource
      } else {
        if (param === undefined) {
          param = paramSource
        }
      }
    }
  }

  if (defaultParam instanceof Object && !(Array.isArray(defaultParam)) && Object.keys(defaultParam).length > 0 && defaultParam !== null) {
    if (!usingDefault) {
      checkParamObject(param, defaultParam)
    }
  }

  return param
}
