function Logger (app) {
  var suppressLogs = app.get('params').suppressLogs.rooseveltLogs

  this.log = function () {
    if (!suppressLogs) {
      console.log(...arguments)
    }
  }

  this.warn = function () {
    console.warn('⚠️ ', ...arguments)
  }

  this.error = function () {
    console.error('❌ ', ...arguments)
  }
}

module.exports = (app) => new Logger(app)
