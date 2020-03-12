// internal Roosevelt file system module

const fs = require('fs-extra')
const Logger = require('roosevelt-logger')

/** Class representing a Roosevelt fs module */
class FSR {
  /**
   * Configure and create the Roosevelt fs module
   * @param {object} app - The Roosevelt Express application instance
   */
  constructor (app) {
    this.generate = true

    if (app) {
      this.generate = app.get('params').generateFolderStructure
      this.logger = app.get('logger')
      this.appName = app.get('appName')
    } else {
      this.generate = true
      this.logger = new Logger()
      this.appName = 'Roosevelt Express'
    }
  }

  /**
   * Write new directory if app is configured to write files and if directory doesn't exist
   * @param {string} dir - Path of directory to create
   * @param {array} log - Log to output if directory is created, if omitted a generic one will be printed
   */
  ensureDirSync (dir, log) {
    if (this.generate && !this.fileExists(dir)) {
      fs.ensureDirSync(dir)
      if (log) {
        this.logger.info(...log)
      } else {
        this.logger.info('📁', `${this.appName} making new directory ${dir}`.yellow)
      }
    }
  }

  /**
   * Write new file if app is configured to write files and if file doesn't exist
   * @param {string} path - Path of file to create
   * @param {string} contents - Contents of file
   * @param {array} log - Log to output if file is created, , if omitted a generic one will be printed
   */
  writeFileSync (path, contents, log) {
    if (this.generate && !this.fileExists(path)) {
      fs.outputFileSync(path, contents)
      if (log) {
        this.logger.info(...log)
      } else {
        this.logger.info('📁', `${this.appName} making new file ${path}`.yellow)
      }
    }
  }

  /**
   * Check if a file or directory exists
   * @param {string} path - Path to check
   * @returns {boolean} - Whether of not the file/directory exists
   */
  fileExists (path) {
    try {
      fs.accessSync(path)
      return true
    } catch {
      return false
    }
  }
}

module.exports = app => new FSR(app)
