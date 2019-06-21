const fse = require('fs-extra')

module.exports = function (appDir, next) {
  // use regexp to check appDir included 'test/app', ensure nothing deleted outside Roosevelt test folder
  if (/test[\\/]app/.test(appDir)) {
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
