var prequire = require('../../parent-require')
  , fork = require('child_process').fork;

describe('loading sample app', function() {
  
  it ('should load correctly', function(done) {
    var proc = fork(__dirname + '/../projects/app/app.js');
    proc.on('message', function(msg) {
      expect(msg.plugins).to.be.an('array');
      expect(msg.plugins[0]).to.equal('fooPlugin (in Framework v1.0.1)');
      expect(msg.plugins[1]).to.equal('bazPlugin (in Framework v1.0.1)');
      done();
    });
  });
  
});
