/**
 * Utility module for checking of the existence of files/symlinks and determining parameters for roosevelt.
 */

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
  },

  // Checks if object is missing properties
  checkObject: function(object1, object2) {
    var i,
        length = Object.keys(object2).length,
        missing = Object.keys(object1).length > length ? false : true;

    if (missing) {
      for (i = 0; i < length; i++) {
        if (!(Object.keys(object2)[i] in object1)) {
          object1[Object.keys(object2)[i]] = object2[Object.keys(object2)[i]];
        }
      }
    }
  },

  // Checks all arguments for valid parameter
  checkParams: function() {
    var args = arguments,
        isObject = false,
        obj,
        value;

    if (args['2'] !== undefined && args['2'] instanceof Object) {
      isObject = true;
    }

    for (obj in args) {
      if (args[obj] !== undefined) {
        if (value !== undefined) {
          if (isObject) {
            module.exports.checkObject(value, args[obj]);
          }
          else {
            return value;
          }
        }
        else {
          value = args[obj];
        }
      }
    }
    return value;
  }
};
