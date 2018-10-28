const sinon = require('sinon')

module.exports = function mockLogger () {
  return function (logging) {
    return {
      log: sinon.stub(),
      error: sinon.stub()
    }
  }
}
