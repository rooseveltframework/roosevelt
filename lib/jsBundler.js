// js bundler

require('colors');

var browserify = require('browserify'),
    fs = require('fs'),
    fse = require('fs-extra');

module.exports = function(app, callback) {
  var params = app.get('params'),
      promises = [];

  // make js directory if not present
  if (!fs.existsSync(app.get('jsPath'))) {
    fse.mkdirsSync(app.get('jsPath'));
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + app.get('jsPath').replace(app.get('appDir'), '')).yellow);
  }

  // make js bundled output directory if not present
  if (params.browserifyBundles.length && !fs.existsSync(params.bundledJsPath)) {
    fse.mkdirsSync(params.bundledJsPath);
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + app.get('appDir') + params.bundledJsPath.replace(app.get('appDir'), '')).yellow);
  }

  params.browserifyBundles.forEach(function(bundle) {
    promises.push(function(bundle) {
      return new Promise(function(resolve, reject) {
        //console.log(app.get('staticsRoot') + app.get('jsPath'));
        browserify(bundle.files, bundle.params ? bundle.params : {
          paths: [app.get('jsPath')]
        }).bundle(function(err, jsCode) {
          if (err) {
            console.error(('❌  ' + (app.get('appName') || 'Roosevelt') + ' failed to write new JS file ' + app.get('appDir') + params.bundledJsPath + '/' + bundle.outputFile + ' due to syntax errors in the source JavaScript\nError: ' + err.message).red);
            throw err;
          }
          else {
            console.log(('📝  ' + (app.get('appName') || 'Roosevelt') + ' writing new JS file ' + app.get('appDir') + params.bundledJsPath + '/' + bundle.outputFile).green);
            fs.writeFileSync(params.bundledJsPath + '/' + bundle.outputFile, jsCode, 'utf8');
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
