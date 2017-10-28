// Utility module for checking the existence of a file to replace deprecated fs.existsSync function

const fs = require('fs')

module.exports = function (path) {
  try {
    fs.accessSync(path)
    return true
  } catch (e) {
    return false
  }
}
