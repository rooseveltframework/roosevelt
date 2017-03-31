// check existence of files and symlinks

var fs = require('fs');

module.exports = {
  // Checks the existence of a file to replace deprecated fs.existsSync function
  fileExists: function(path) {
    try {
      fs.accessSync(path);
      return true;
    }
    catch (e) {
      return false;
    }
  },

  // Checks if symlink exists
  symlinkExists: function(path) {
    try {
      fs.readlinkSync(path);
      return true;
    }
    catch (e) {
      return false;
    }
  }
};
