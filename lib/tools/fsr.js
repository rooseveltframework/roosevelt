// internal Roosevelt file system module

const fs = require('fs-extra')
const path = require('path')

class FSR {
  constructor (app) {
    this.generate = true

    if (app) {
      this.generate = app.get('params').generateFolderStructure
    }
  }

  ensureDirSync (dir) {
    if (this.generate) {
      fs.ensureDirSync(dir)
      return true
    }
  }

  symlinkSync () {
    if (this.generate) {
      try {
        fs.symlinkSync(...arguments)
      } catch (e) {
        fs.ensureDirSync(path.resolve(arguments[1], '..'))
        fs.symlinkSync(...arguments)
      }
      return true
    }
  }

  writeFileSync () {
    if (this.generate) {
      fs.writeFileSync(...arguments)
      return true
    }
  }

  openSync () {
    if (this.generate) {
      fs.openSync(...arguments)
      return true
    }
  }

  fileExists (path) {
    try {
      fs.accessSync(path)
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = (app) => new FSR(app)
