module.exports = function (userParam, defaultParam) {
  const defaultKeys = Object.keys(defaultParam)
  let defaultProp
  const extraOrMissingkeysBool = false

  if (defaultParam['_roosevelt-missing-exempt'] !== true) {
    defaultKeys.forEach((key) => {
      defaultProp = defaultParam[key]
      if (userParam[key] === undefined && key !== '_roosevelt-extra-exempt') {
        userParam[key] = defaultProp
      } else if (defaultProp instanceof Object && !(Array.isArray(defaultProp)) && Object.keys(defaultProp).length > 0 && defaultProp !== null) {
        module.exports(userParam[key], defaultProp)
      }
    })
  }
  return extraOrMissingkeysBool
}
