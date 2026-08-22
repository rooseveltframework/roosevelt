// which major version of express the app installed
// express is a peer dependency, so this is whatever the app chose rather than something roosevelt controls
// a few things roosevelt does differ between express 4 and 5, most notably the syntax for a catch all route
const { version } = require('express/package.json')

module.exports = parseInt(version.split('.')[0], 10)
