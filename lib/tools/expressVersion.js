// which major version of express the app installed
//
// express is a peer dependency, so this is whatever the app chose rather than something roosevelt controls. it is read from the app for the same reason express itself is: roosevelt may have a copy of its own, such as when it is a symlink to a clone, and that one is not the one running
//
// a few things roosevelt does differ between express 4 and 5, most notably the syntax for a catch all route
const requireFromApp = require('./requireFromApp')

module.exports = appDir => parseInt(requireFromApp(appDir, 'express/package.json', require).version.split('.')[0], 10)
