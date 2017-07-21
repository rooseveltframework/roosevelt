// js bundler

require('colors');

var browserify = require('browserify'),
    path = require('path'),
    fse = require('fs-extra'),
    utils = require('./utils');

module.exports = function(app, callback) {
  var params = app.get('params'),
      bundleBuildDir = app.get('jsCompiledOutput') + (params.bundledJsPath.replace(params.jsPath, '')),
      bundleEnv,
      promises = [];

  // make js directory if not present
  if (!utils.fileExists(app.get('jsPath'))) {
    fse.mkdirsSync(app.get('jsPath'));
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(app.get('jsPath').replace(app.get('appDir'), ''))).yellow);
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !utils.fileExists(params.bundledJsPath)) {
    fse.mkdirsSync(params.bundledJsPath);
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(app.get('appDir') + params.bundledJsPath.replace(app.get('appDir'))), '').yellow);
  }

  // make js bundled output directory in build directory if not present
  if (params.browserifyBundles.length && params.exposeBundles && !utils.fileExists(bundleBuildDir)) {
    fse.mkdirsSync(bundleBuildDir);
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(bundleBuildDir), '').yellow);
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
          browserify(bundle.files, bundle.params ? bundle.params : {
            paths: [app.get('jsPath')]
          }).bundle(function(err, jsCode) {
            if (err) {
              console.error(('❌  ' + (app.get('appName') || 'Roosevelt') + ' failed to write new JS file ' + path.normalize(app.get('appDir') + params.bundledJsPath + '/' + bundle.outputFile) + ' due to syntax errors in the source JavaScript\nError: ' + err.message).red);
              throw err;
            }
            else {
              console.log(('📝  ' + (app.get('appName') || 'Roosevelt') + ' writing new JS file ' + path.normalize(app.get('appDir') + params.bundledJsPath + '/' + bundle.outputFile)).green);
              fse.writeFileSync(app.get('appDir') + params.bundledJsPath + '/' + bundle.outputFile, jsCode, 'utf8');
              if (params.exposeBundles) {
                console.log(('📝  ' + (app.get('appName') || 'Roosevelt') + ' writing new JS file ' + path.normalize(bundleBuildDir + '/' + bundle.outputFile)).green);
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
