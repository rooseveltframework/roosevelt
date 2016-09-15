// Handles Browserify bundling for static JavaScript files
'use strict';

var colors = require('colors'),
    fs = require('fs-extra'),
    browserify = require('browserify'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json');
pkg.rooseveltConfig = pkg.rooseveltConfig || {};

module.exports = function(app) {
  var options = {
    paths: ['statics/js/'],
    entries: ['statics/js/main.js']
  };

  app.set('package', pkg);

  // Sets bundled file name to be main.js if none is present in Roosevelt's configuration
  if (!pkg.rooseveltConfig.browserifyFileName) {
    pkg.rooseveltConfig.browserifyFileName = 'main.js';
  }

  // Checks if a dev.js file is present and the user is running in development mode
  if (process.env.NODE_ENV === 'development' && fs.statSync('statics/js/dev.js')) {
    options.entries.push('statics/js/dev.js');
  }

  // Begins Browserify bundling
  browserify(options).bundle(function(err, jsCode) {
    if (err) {
      console.error(('The browserify step cannot be completed due to syntax errors in the source JavaScript\nError: ' + err.message).red);
      throw err;
    }
    else {
      // Ensures that the build directory exists and creates a bundled JavaScript file. If the directory structure does not exist, it is created.
      fs.ensureDirSync('statics/.build/js');
      fs.writeFileSync('statics/.build/js/' + pkg.rooseveltConfig.browserifyFileName, jsCode, 'utf8');
    }
  });
};
