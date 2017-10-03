// js bundler

require('colors');

var browserify = require('browserify'),
    path = require('path'),
    fse = require('fs-extra'),
    utils = require('./utils');

module.exports = function(app, callback) {
  var params = app.get('params'),
      appDir = app.get('appDir'),
      appName = app.get('appName'),
      jsPath = app.get('jsPath'),
      bundleBuildDir = path.join(app.get('jsCompiledOutput'), (params.bundledJsPath.replace(params.jsPath, ''))),
      bundleEnv,
      promises = [];

  // make js directory if not present
  if (!utils.fileExists(jsPath)) {
    fse.mkdirsSync(jsPath);
    if (app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${jsPath}`.yellow);
    }
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !utils.fileExists(params.bundledJsPath)) {
    fse.mkdirsSync(params.bundledJsPath);
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${path.join(appDir, params.bundledJsPath)}`.yellow);
    }
  }

  // make js bundled output directory in build directory if not present
  if (params.browserifyBundles.length && params.exposeBundles && !utils.fileExists(bundleBuildDir)) {
    fse.mkdirsSync(bundleBuildDir);
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${bundleBuildDir}`.yellow);
    }
  }

  // check if app was launched in dev or prod mode
  if (process.env.NODE_ENV === 'development') {
    bundleEnv = 'dev';
  }
  else {
    bundleEnv = 'prod';
  }

  params.browserifyBundles.forEach(function(bundle) {
    if (bundle.env === bundleEnv || !bundle.env) {
      promises.push(function(bundle) {
        return new Promise(function(resolve, reject) {
          var i;

          for (i in bundle.files) {
            bundle.files[i] = path.join(jsPath, bundle.files[i]);
          }

          bundle.params = bundle.params || {};

          if (bundle.params.paths) {
            for (i in bundle.params.paths) {
              bundle.params.paths[i] = path.join(appDir, bundle.params.paths[i]);
            }
          }
          else {
            bundle.params.paths = [
              jsPath
            ];
          }

          browserify(bundle.files, bundle.params).bundle(function(err, jsCode) {
            if (err) {
              console.error(`❌  ${appName} failed to write new JS file ${path.join(appDir, params.bundledJsPath, bundle.outputFile)} due to syntax errors in the source JavaScript\nError: ${err.message}`.red);
              throw err;
            }
            else {
              if (!app.get('params').suppressLogs.rooseveltLogs) {
                console.log(`📝  ${appName} writing new JS file ${path.join(appDir, params.bundledJsPath, bundle.outputFile)}`.green);
              }
              fse.writeFileSync(path.join(appDir, params.bundledJsPath, bundle.outputFile), jsCode, 'utf8');
              if (params.exposeBundles) {
                if (!app.get('params').suppressLogs.rooseveltLogs) {
                  console.log(`📝  ${appName} writing new JS file ${path.join(bundleBuildDir, bundle.outputFile)}`.green);
                }
                fse.writeFileSync(path.join(bundleBuildDir, bundle.outputFile), jsCode, 'utf8');
              }
            }
            resolve();
          });
        });
      }(bundle));
    }
  });

  Promise.all(promises).then(function() {
    callback();
  });
};
