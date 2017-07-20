// gets the absolute path on disk of the file which required roosevelt

require('colors');

var klawSync = require('klaw-sync'),
    fs = require('fs'),
    path = require('path'),
    parent = module,
    filepath = parent.filename,
    appDir,
    paths,
    found = false,
    klawedAppDir,
    pathCounter,
    pkgContents,
    keys,

    // filter to remove node_modules and .git whilst klawing. (from the klaw-sync npm page)
    filterFn = item => item.path.indexOf('node_modules') < 0 && item.path.indexOf('.git') < 0;

while (filepath.indexOf('roosevelt.js') === -1) {
  parent = parent.parent;
  filepath = parent.filename;
}

// still one more
parent = parent.parent;
filepath = parent.filename;

appDir = filepath.split(path.sep);
appDir = filepath.replace(appDir[appDir.length - 1], '');

// get all files in the current dir filtering out .git and node_modules if they are there
paths = klawSync(appDir, {filter: filterFn, noRecurseOnFailedFilter: true});
klawedAppDir = appDir;

// find the root dir of the project from the absolute path by klawing for package.json
while (found === false) {
  for (pathCounter = 0; pathCounter < paths.length; pathCounter++) {
    aPath = paths[pathCounter];
    if (aPath.path.includes('package.json')) {
      found = true;
      break;
    }
  }

  if (found === true) {
    break;
  }

  // get parent dir
  klawedAppDir = klawedAppDir.split(path.sep);
  klawedAppDir = klawedAppDir.slice(0, klawedAppDir.length-2);
  klawedAppDir = klawedAppDir.join(path.sep);
  klawedAppDir +=  path.sep;

  // filter again as we go up
  paths = klawSync(klawedAppDir, {filter: filterFn, noRecurseOnFailedFilter: true});
}

// look for roosevelt config in the package.json
// JOSNify file data
pkgContents = JSON.parse(fs.readFileSync(klawedAppDir + 'package.json'));
keys = Object.keys(pkgContents);

// choose between old(stable) and klawed
appDir = keys.includes('rooseveltConfig') ? klawedAppDir : appDir;

module.exports = appDir;
