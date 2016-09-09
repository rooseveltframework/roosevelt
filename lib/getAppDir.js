// gets the absolute path on disk of the file which required roosevelt

var os = require('os'),
    parent = module,
    filepath = parent.filename,
    appDir;

while (filepath.indexOf('roosevelt.js') === -1) {
  parent = parent.parent;
  filepath = parent.filename;
}

// still one more
parent = parent.parent;
filepath = parent.filename;

appDir = os.platform() !== 'win32' ? filepath.split('/') : filepath.split('\\');
appDir = filepath.replace(appDir[appDir.length - 1], '');

module.exports = appDir;