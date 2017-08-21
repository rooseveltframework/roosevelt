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
      bundleBuildDir = app.get('jsCompiledOutput') + (params.bundledJsPath.replace(params.jsPath, '')),
      bundleEnv,
      promises = [];

  // make js directory if not present
  if (!utils.fileExists(app.get('jsPath'))) {
    fse.mkdirsSync(app.get('jsPath'));
    if (app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${path.normalize(app.get('jsPath').replace(appDir, ''))}`.yellow);
    }
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !utils.fileExists(params.bundledJsPath)) {
    fse.mkdirsSync(params.bundledJsPath);
    if (!app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${path.normalize(appDir + params.bundledJsPath.replace(appDir, ''))}`.yellow);
    }
  }

  // make js bundled output directory in build directory if not present
  if (params.browserifyBundles.length && params.exposeBundles && !utils.fileExists(bundleBuildDir)) {
    fse.mkdirsSync(bundleBuildDir);
    if (!app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${path.normalize(bundleBuildDir)}`.yellow);
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
          var i,
              l = bundle.files.length;

          for (i = 0; i < l; i++) {
            bundle.files[i] = app.get('jsPath') + bundle.files[i];
          }
          if (bundle.params.paths) {
            for (i in bundle.params.paths) {
              bundle.params.paths[i] = appDir + bundle.params.paths[i];
            }
          }
          browserify(bundle.files, bundle.params ? bundle.params : {
            paths: [appDir + app.get('jsPath')]
          }).bundle(function(err, jsCode) {
            if (err) {
              console.error(`❌  ${appName} failed to write new JS file ${path.normalize(appDir + params.bundledJsPath + '/' + bundle.outputFile)} due to syntax errors in the source JavaScript\nError: ${err.message}`.red);
              throw err;
            }
            else {
              if (!app.get('suppressLogs')) {
                console.log(`📝  ${appName} writing new JS file ${path.normalize(appDir + params.bundledJsPath + '/' + bundle.outputFile)}`.green);
              }
              fse.writeFileSync(appDir + params.bundledJsPath + '/' + bundle.outputFile, jsCode, 'utf8');
              if (params.exposeBundles) {
                if (!app.get('suppressLogs')) {
                  console.log(`📝  ${appName} writing new JS file ${path.normalize(bundleBuildDir + '/' + bundle.outputFile)}`.green);
                }
                fse.writeFileSync(bundleBuildDir + '/' + bundle.outputFile, jsCode, 'utf8');
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
