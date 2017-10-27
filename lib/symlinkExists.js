// Utility module for checking existence of a symlink

const fs = require('fs')

module.exports = function (path) {
  try {
    fs.readlinkSync(path)
    return true
  } catch (e) {
    return false
  }
}
