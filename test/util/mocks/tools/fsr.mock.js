const sinon = require('sinon')

module.exports = function mockFsr () {
  return function (app) {
    return {
      fileExists: sinon.stub(),
      ensureDirSync: sinon.stub(),
      writeFileSync: sinon.stub()
    }
  }
}
