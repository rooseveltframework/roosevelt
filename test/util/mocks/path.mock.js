const sinon = require('sinon')

module.exports = function mockPath () {
  return {
    join: sinon.stub().returns('path.join result')
  }
}
