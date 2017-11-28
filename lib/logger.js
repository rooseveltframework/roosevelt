function Logger (app) {
  var suppressLogs = app.get('params').suppressLogs.rooseveltLogs

  this.log = function () {
    if (!suppressLogs) {
      console.log(...arguments)
    }
  }

  this.warn = function () {
    console.log('⚠️ ', ...arguments)
  }

  this.error = function () {
    console.log('❌ ', ...arguments)
  }
}

module.exports = (app) => new Logger(app)
