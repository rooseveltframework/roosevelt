// internal Roosevelt file system module

const fs = require('fs-extra')
const path = require('path')
const Logger = require('roosevelt-logger')
const logger = new Logger()

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
        if (e.code === 'EEXIST') {
          logger.error('It appears your Roosevelt app has been moved. You may want to run `npm run clean` to remove the broken symlinks.')
          process.exit(1)
        } else {
          fs.ensureDirSync(path.resolve(arguments[1], '..'))
          fs.symlinkSync(...arguments)
        }
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
