const fse = require('fs-extra')
const path = require('path')

module.exports = function (appDir, next) {
  if (appDir.includes(`roosevelt${path.sep}test${path.sep}app`)) {
    fse.remove(appDir, (err) => {
      if (err) {
        next(err)
      } else {
        next()
      }
    })
  } else {
    next(new Error(`Directory ${appDir} is not a test app and will not be deleted.`))
  }
}
