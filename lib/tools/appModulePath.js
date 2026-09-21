// makes the app's own folders requirable by name, so that a controller can `require('models/dataModel')` instead of working out a relative path to it
//
// this was the app-module-path package, inlined because that package last saw a commit in 2018 and calls `module.parent`, which node has deprecated; what it does is small enough to own, and owning it means a fix is a commit here rather than a fork
//
// it works by extending the list of directories node searches to resolve a bare require. `Module._nodeModulePaths` is what node calls to build that list for a module as it loads, so anything loaded after a path is added can see it
const { Module } = require('module')
const path = require('path')

const searchPaths = []
const allowedDirs = new Set()
const nodeModulePaths = Module._nodeModulePaths

// a file inside node_modules must not reach the app's folders by accident: a dependency that happens to require something called `models/foo` means its own, not yours
//
// a directory that was added on purpose is allowed whatever it sits inside, so an app living under a node_modules directory still works
function allowed (from) {
  let dir = from
  while (dir) {
    if (allowedDirs.has(dir)) return true
    if (path.basename(dir) === 'node_modules') return false
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return true
}

Module._nodeModulePaths = function (from) {
  const paths = nodeModulePaths.call(this, from)
  return allowed(from) ? paths.concat(searchPaths) : paths
}

// adds a directory to the list every bare require searches
function addPath (dir) {
  dir = path.normalize(dir)
  if (searchPaths.includes(dir)) return
  allowedDirs.add(dir)
  searchPaths.push(dir)

  // the entry point was loaded before this ran, so its own search list is already fixed and has to be extended directly rather than through the patch above
  //
  // the package this replaced also walked `module.parent` to do the same for every module between here and the entry point, which is what tripped node's deprecation warning; roosevelt does not need it, because nothing it has already loaded requires app code by name
  if (require.main && !require.main.paths.includes(dir)) require.main.paths.push(dir)
}

module.exports = { addPath }
