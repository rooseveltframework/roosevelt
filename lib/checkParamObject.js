// Utility module for validating Roosevelt param objects

module.exports = function (userParam, defaultParam, paramKey) {
  let userKeys = Object.keys(userParam)
  let defaultKeys = Object.keys(defaultParam)

  if (userKeys.length < defaultKeys.length) {
    defaultKeys.forEach(function (defaultKey) {
      if (!(defaultKey in userParam)) {
        if (paramKey) {
          console.log(`⚠️   Missing param ${defaultKey} in ${paramKey}!`.red.bold)
        } else {
          userParam[defaultKey] = defaultParam[defaultKey]
        }
      } else if (defaultParam[defaultKey] !== (undefined || []) && defaultParam[defaultKey] instanceof Object) {
        // recurse if param contains object and isn't specified not to
        if (!defaultParam[defaultKey]['rooseveltNoRecurse']) {
          module.exports(userParam[defaultKey], defaultParam[defaultKey], defaultKey)
        }
      }
    })
  }
}
