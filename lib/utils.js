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

  // Checks if object is missing properties recursively
  checkObject: function(userParam, defaultParam, paramKey) {
    var userKeys = Object.keys(userParam),
        defaultKeys = Object.keys(defaultParam),
        errors;

    if (userKeys.length < defaultKeys.length) {
      defaultKeys.forEach(function(defaultKey) {
        if (!(defaultKey in userParam)) {
          if (paramKey) {
            console.log(`⚠️  Missing param ${defaultKey} in ${paramKey}!`.red.bold);
            errors = true;
          }
          else {
            userParam[defaultKey] = defaultParam[defaultKey];
          }
        }
        else if (defaultParam[defaultKey] !== (undefined || []) && defaultParam[defaultKey] instanceof Object) {
          // recurse if param contains object and isn't specified not to
          if (!defaultParam[defaultKey]['rooseveltNoRecurse']) {
            module.exports.checkObject(userParam[defaultKey], defaultParam[defaultKey], defaultKey);
          }
        }
      });
    }

    if (errors) {
      return true;
    }
  },

  // Checks all arguments for valid parameter
  checkParams: function() {
    var args = arguments,
        defaultParam = args['2'],
        i,
        value;

    for (i in args) {
      if (args[i] !== undefined) {
        if (value !== undefined) {
          if (defaultParam !== (undefined || []) && defaultParam instanceof Object) {
            module.exports.checkObject(value, defaultParam);
          }
          else {
            return value;
          }
        }
        else {
          value = args[i];
        }
      }
    }
    return value;
  },

  // Return array of a function's arguments
  getArguments: function getArgs(func) {
    // First match everything inside the function argument parens.
    var args = func.toString().match(/function\s.*?\(([^)]*)\)/)[1];

    // Split the arguments string into an array comma delimited.
    return args.split(',').map(function(arg) {
      // Ensure no inline comments are parsed and trim the whitespace.
      return arg.replace(/\/\*.*\*\//, '').trim();
    }).filter(function(arg) {
      // Ensure no undefined values are added.
      return arg;
    });
  }
};
