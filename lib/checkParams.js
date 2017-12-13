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
      // if no user param is passed, ensure that it's required before setting the default
      if (paramSource === defaultParam && !param) {
        usingDefault = true
        if (!defaultParam.optional) {
          param = paramSource.value
        } else {
          param = null
        }
      } else {
        if (!param) {
          param = paramSource
        }
      }
    }
  }

  if (defaultParam.value instanceof Object && !(Array.isArray(defaultParam.value)) && Object.keys(defaultParam.value).length > 0 && defaultParam.value !== null) {
    if (!usingDefault) {
      checkParamObject(param, defaultParam)
    } else if (!defaultParam.optional) {
      checkParamObject(param, defaultParam, 'setDefault')
    }
  }

  return param
}
