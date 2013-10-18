#! /usr/bin/env node
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