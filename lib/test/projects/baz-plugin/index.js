try {
  var framework = require('framework');
} catch (_) {
  var prequire = require('../../../parent-require')
    , framework = prequire('framework');
}

exports.info = function() {
  return 'bazPlugin (in Framework v' + framework.version + ')';
};
