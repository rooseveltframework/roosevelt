// gets the absolute path on disk of the file which required roosevelt

require('colors');

var klawSync = require('klaw-sync'),
    path = require('path'),
    parent = module,
    arg,
    pathInArg,
    filePath = parent.filename,
    appDir,
    paths,
    found,
    klawedAppDir,
    currentPath,
    pkgContents,
    keys,
    i,

    // filter to remove node_modules and .git whilst klawing. (from the klaw-sync npm page)
    filterFn = item => item.path.indexOf('node_modules') < 0 && item.path.indexOf('.git') < 0;

for (i in process.argv) {
  arg = process.argv[i];

  // check if a lib is called or cwd matches app directory (e.g. running npm script)
  if (arg.includes(`roosevelt${path.sep}lib`) || arg.includes(process.cwd)) {
    filePath = arg;
    pathInArg = true;
    break;
  }
}

// fallback method if app is fired outside its directory
if (!pathInArg) {
  while (!filePath.includes('roosevelt.js')) {
    parent = parent.parent;
    filePath = parent.filename;
  }

  // still one more
  parent = parent.parent;
  filePath = parent.filename;
}

appDir = filePath.split(path.sep);
appDir = filePath.replace(appDir[appDir.length - 1], '');

// get all files in the current dir filtering out .git and node_modules if they are there
paths = klawSync(appDir, {filter: filterFn, noRecurseOnFailedFilter: true});
klawedAppDir = appDir;

// find the root dir of the project from the absolute path by klawing for package.json
while (!found) {
  for (i in paths) {
    currentPath = paths[i];
    if (currentPath.path.includes('package.json')) {
      found = true;
      break;
    }
  }

  if (found) {
    break;
  }

  // get parent dir
  klawedAppDir = klawedAppDir.split(path.sep);
  klawedAppDir = klawedAppDir.slice(0, klawedAppDir.length - 2);
  klawedAppDir = klawedAppDir.join(path.sep) + path.sep;

  // filter again as we go up
  paths = klawSync(klawedAppDir, {filter: filterFn, noRecurseOnFailedFilter: true});
}

// look for roosevelt config in the package.json
pkgContents = require(klawedAppDir + 'package.json');
keys = Object.keys(pkgContents);

// choose between old(stable) and klawed
appDir = keys.includes('rooseveltConfig') ? klawedAppDir : appDir;

module.exports = appDir;
