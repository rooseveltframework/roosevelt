#! /usr/bin/env node
/**
 * Roosevelt MVC web framework CLI tool
 * @author Eric Newport (kethinov)
 * @license Creative Commons Attribution 3.0 Unported License http://creativecommons.org/licenses/by/3.0/deed.en_US
 */

/*! @source https://github.com/kethinov/roosevelt */
/*jshint camelcase: true, curly: true, eqeqeq: false, forin: false, strict: false, trailing: true, evil: true, devel: true, node: true */

var package = require('./package.json'),
    wrench = require('wrench'),
    cmd = process.argv[2],
    arg = process.argv[3],
    showHelp = function() {
      console.log("Roosevelt MVC web framework\n");
      console.log("Version "+package.version+"\n");
      console.log("USAGE:");
      console.log("roosevelt create .                     create sample roosevelt app in current working directory");
      console.log("roosevelt create /path/to/somewhere    create sample roosevelt app in /path/to/somewhere");
    };

if (cmd && arg) {
  if (cmd == 'create') {
    try {
      wrench.copyDirSyncRecursive(__dirname + '/sampleApp/', arg);
    }
    catch (e) {
      console.log(e);
    }
  }
}
else if (cmd && (cmd == '-v' || cmd == '--v' || cmd == '-version' || cmd == '--version')) {
  console.log(package.version);
}
else {
  showHelp();
}