const fs = require('fs-extra')
const path = require('path')

module.exports = location => {
  const appDir = path.join(__dirname, `../app/${location}`)

  return new Promise(resolve => {
    // use regexp to check appDir included 'test/app', ensure nothing deleted outside Roosevelt test folder
    if (/test[\\/]app/.test(appDir)) {
      fs.remove(appDir, err => {
        if (err) {
          throw err
        } else {
          resolve()
        }
      })
    } else {
      throw new Error(`Directory ${appDir} is not a test app and will not be deleted.`)
    }
  })
}
