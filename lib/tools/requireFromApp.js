// loads a package the app is responsible for installing, such as express, its view engine, its css preprocessor, or its js bundler, from the app's own dependencies
//
// a plain require from roosevelt's files searches roosevelt's own node_modules first. that is harmless in an ordinary install, where roosevelt has no copy of these and the search reaches the app's, but it quietly loads the wrong copy whenever roosevelt does have one: when roosevelt is a symlink to a clone, which is how contributing.md says to test one against an app, or when a package manager keeps each package's dependencies apart the way pnpm does. resolving from the app's directory finds the version the app installed, and the caller's own require is kept as the fallback for anything the app does not have, so that a path written relative to the file asking for it still resolves as it always did
const path = require('path')
const { createRequire } = require('module')

module.exports = (appDir, name, fallbackRequire) => {
  try {
    return createRequire(path.resolve(appDir, 'package.json'))(name) // resolved, since createRequire needs an absolute path and an app directory can be given as a relative one
  } catch (err) {
    // only the package itself being absent falls back. a package the app has that fails to load, or that is missing one of its own dependencies, is reported as it is rather than covered up by a different copy
    if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(`'${name}'`)) throw err
  }
  return fallbackRequire(name)
}
