// internal Roosevelt file system module

const fse = require('fs-extra')
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
      fse.ensureDirSync(dir)
      return true
    }
  }

  symlinkSync () {
    if (this.generate) {
      try {
        fse.symlinkSync(...arguments)
      } catch (e) {
        fse.ensureDirSync(path.resolve(arguments[1], '..'))
        fse.symlinkSync(...arguments)
      }
      return true
    }
  }

  writeFileSync () {
    if (this.generate) {
      fse.writeFileSync(...arguments)
      return true
    }
  }

  openSync () {
    if (this.generate) {
      fse.openSync(...arguments)
      return true
    }
  }

  fileExists (path) {
    try {
      fse.accessSync(path)
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = (app) => new FSR(app)
