// internal Roosevelt file system module

const fs = require('fs')
const fse = require('fs-extra')

function FSR (app) {
  let generate = true

  if (app) {
    generate = app.get('params').generateFolderStructure
  }

  this.ensureDirSync = function (dir) {
    if (generate) {
      fse.ensureDirSync(dir)
      return true
    } else {
      return false
    }
  }

  this.symlinkSync = function () {
    if (generate) {
      fs.symlinkSync(...arguments)
      return true
    } else {
      return false
    }
  }

  this.writeFileSync = function () {
    if (generate) {
      fs.writeFileSync(...arguments)
    } else {
      return false
    }
  }

  this.openSync = function () {
    if (generate) {
      fs.openSync(...arguments)
      return true
    } else {
      return false
    }
  }
}

module.exports = (app) => new FSR(app)
