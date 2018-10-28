const sinon = require('sinon')

module.exports = function mockBrowserify () {
  return function (files, params) {
    return {
      bundle: sinon.stub()
    }
  }
}
