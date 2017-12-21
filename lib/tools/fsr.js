// internal Roosevelt file system module

const fs = require('fs')
const fse = require('fs-extra')

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
      fs.symlinkSync(...arguments)
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
}

module.exports = (app) => new FSR(app)
