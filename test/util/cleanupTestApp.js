const rimraf = require('rimraf')
const path = require('path')

module.exports = function (appDir, next) {
  if (appDir.includes(`roosevelt${path.sep}test${path.sep}app`)) {
    rimraf(appDir, (err) => {
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
