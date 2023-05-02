var prequire = require('./../parent-require');

describe('parent-require', function() {
  
  it('should be a function', function() {
    expect(prequire).to.be.a('function');
  });
  
  it('should throw error if unable to resolve module', function() {
    expect(function() {
      prequire('foobar');
    }).to.throw(Error, "Cannot find module 'foobar' from parent");
  });
  
});
