// js compiler

require('colors');

var fs = require('fs'),
    path = require('path'),
    fse = require('fs-extra'),
    klawSync = require('klaw-sync'),
    prequire = require('parent-require'),
    checkFiles = require('./checkFiles');

module.exports = function(app, callback) {
  var params = app.get('params'),
      preprocessor = params.jsCompiler.nodeModule,
      preprocessorModule,
      jsFiles,
      usingWhitelist = params.jsCompilerWhitelist ? true : false,
      promises = [];

  if (params.jsCompiler === 'none') {
    callback();
    return;
  }

  // check if using whitelist before populating jsFiles
  if (usingWhitelist) {
    if (typeof params.jsCompilerWhitelist !== 'object') {
      console.error('❌  jsCompilerWhitelist not configured correctly. Please ensure that it is an array. See https://github.com/rooseveltframework/roosevelt#statics-parameters for configuration instructions'.red);
      callback();
      return;
    }
    else {
      jsFiles = params.jsCompilerWhitelist;
    }
  }
  else {
    jsFiles = klawSync(app.get('jsPath'));
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor);
  }
  catch (err) {
    console.error(('❌  ' + (app.get('appName') || 'Roosevelt') + ' failed to include your JS compiler! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.').red);
    console.error(err);
    callback();
    return;
  }

  // make js compiled output directory if not present
  if (params.jsCompiler && params.jsCompiler.nodeModule && !checkFiles.fileExists(app.get('jsCompiledOutput'))) {
    fse.mkdirsSync(app.get('jsCompiledOutput'));
    console.log(('📁  ' + (app.get('package').name || 'Roosevelt') + ' making new directory ' + app.get('jsCompiledOutput').replace(app.get('appDir'), '')).yellow);
  }

  jsFiles.forEach(function(file) {
    file = file.path ? file.path : file;
    promises.push(function(file) {
      return new Promise(function(resolve, reject) {
        var split,
            altdest;

        if (usingWhitelist === true) {
          split = file.split(':');
          altdest = split[1];
          file = split[0];
        }

        // when using whitelist determine the file exists first
        if (usingWhitelist) {
          if (!checkFiles.fileExists(path.normalize(app.get('jsPath') + file))) {
            console.error('❌  ' + (file + ' specified in jsCompilerWhitelist does not exist. Please ensure file is entered properly').red);
            resolve();
            return;
          }
        }

        if (file === '.' || file === '..' || file === 'Thumbs.db' || fs.lstatSync(usingWhitelist === true ? path.normalize(app.get('jsPath') + file) : file).isDirectory()) {
          resolve();
          return;
        }
        file = file.replace(app.get('jsPath'), '');
        preprocessorModule.parse(app, file, (app.get('jsCompiledOutput') + (altdest ? altdest : file)), function(err, newJs) {
          var newFile;
          if (err) {
            console.error(('❌  ' + (app.get('appName') || 'Roosevelt') + ' failed to parse ' + file + '. Please ensure that it is coded correctly.').red);
            console.error(err);
            resolve();
          }
          else {
            if (altdest) {
              newFile = app.get('jsCompiledOutput') + altdest;
              fse.mkdirsSync(path.dirname(newFile));
            }
            else {
              newFile = app.get('jsCompiledOutput') + file;
              fse.mkdirsSync(app.get('jsCompiledOutput') + path.dirname(file));
            }
            fs.openSync(newFile, 'a'); // create it if it does not already exist
            if (fs.readFileSync(newFile, 'utf8') !== newJs) {
              fs.writeFile(newFile, newJs, function(err) {
                if (err) {
                  console.error(('❌  ' + (app.get('appName') || 'Roosevelt') + ' failed to write new JS file ' + newFile).red);
                  console.error(err);
                }
                else {
                  console.log(('📝  ' + (app.get('appName') || 'Roosevelt') + ' writing new JS file ' + newFile).green);
                }
                resolve();
              });
            }
            else {
              resolve();
            }
          }
        });
      });
    }(file));
  });

  Promise.all(promises).then(function() {
    callback();
  });
};
