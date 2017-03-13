// js bundler

require('colors');

var browserify = require('browserify'),
    path = require('path'),
    fse = require('fs-extra');

module.exports = function(app, callback) {
  var params = app.get('params'),
      bundleBuildDir = app.get('jsCompiledOutput') + (params.bundledJsPath.replace(params.jsPath, '')),
      bundleToUse,
      promises = [];

  // make js directory if not present
  if (!fse.existsSync(app.get('jsPath'))) {
    fse.mkdirsSync(app.get('jsPath'));
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(app.get('jsPath').replace(app.get('appDir'), ''))).yellow);
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !fse.existsSync(params.bundledJsPath)) {
    fse.mkdirsSync(params.bundledJsPath);
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(app.get('appDir') + params.bundledJsPath.replace(app.get('appDir'))), '').yellow);
  }

  // make js bundled output directory in build directory if not present
  if (params.browserifyBundles.length && params.exposeBundles && !fse.existsSync(bundleBuildDir)) {
    fse.mkdirsSync(bundleBuildDir);
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + path.normalize(bundleBuildDir), '').yellow);
  }

  params.browserifyBundles.forEach(function(bundle) {

    // check if app is in dev mode and devOnlyBundle param is set
    if (process.env.NODE_ENV === 'development' && bundle.devOnlyBundle !== undefined && bundle.devOnlyBundle.length > 0) {
      bundleToUse = 'devOnlyBundle';
    }
    else {
      bundleToUse = 'files';
    }

    promises.push(function(bundle) {
      return new Promise(function(resolve, reject) {
        var i,
            l = bundle[bundleToUse].length;

        for (i = 0; i < l; i++) {
          bundle[bundleToUse][i] = app.get('jsPath') + bundle[bundleToUse][i];
        }
        browserify(bundle[bundleToUse], bundle.params ? bundle.params : {
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
  });

  Promise.all(promises).then(function() {
    callback();
  });
};
