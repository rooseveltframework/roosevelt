// js compiler

require('colors');

var fs = require('fs'),
    path = require('path'),
    fse = require('fs-extra'),
    klawSync = require('klaw-sync'),
    prequire = require('parent-require'),
    util = require('util'),
    utils = require('./utils');

module.exports = function(app, callback) {
  var params = app.get('params'),
      appName = app.get('appName'),
      preprocessor = params.jsCompiler.nodeModule,
      preprocessorModule,
      jsPath = app.get('jsPath'),
      jsCompiledOutput = app.get('jsCompiledOutput'),
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
    jsFiles = klawSync(jsPath);
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor);
  }
  catch (err) {
    console.error(`❌  ${appName} failed to include your JS compiler! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.`.red);
    console.error(err);
    callback();
    return;
  }

  // make js compiled output directory if not present
  if (params.jsCompiler && params.jsCompiler.nodeModule && !utils.fileExists(jsCompiledOutput)) {
    fse.mkdirsSync(jsCompiledOutput);
    if (!app.get('params').suppressLogs.rooseveltLogs) {
      console.log(`📁  ${appName} making new directory ${jsCompiledOutput}`.yellow);
    }
  }

  jsFiles.forEach(function(file) {
    file = file.path ? file.path : file;
    promises.push(function(file) {
      return new Promise(function(resolve, reject) {
        var split,
            altdest,
            newFile;

        if (usingWhitelist === true) {
          split = file.split(':');
          altdest = split[1];
          file = split[0];
        }

        // when using whitelist determine the file exists first
        if (usingWhitelist) {
          if (!utils.fileExists(path.join(jsPath, file))) {
            throw `❌  ${file} specified in jsCompilerWhitelist does not exist. Please ensure file is entered properly.`.red;
            reject();
            return;
          }
        }

        if (file === '.' || file === '..' || file === 'Thumbs.db' || fs.lstatSync(usingWhitelist === true ? path.join(jsPath, file) : file).isDirectory()) {
          resolve();
          return;
        }
        file = file.replace(jsPath, '');
        newFile = path.join(jsCompiledOutput, (altdest ? altdest : file));

        // disable minify if noMinify param is present in roosevelt
        if (app.get('params').noMinify) {
          fs.createReadStream(path.join(jsPath, file)).pipe(fs.createWriteStream(newFile));
          newJs = fs.readFileSync(path.join(jsPath, file), 'utf-8');
        }
        // compress the js via the compiler set in roosevelt params
        else {
          try {
            newJs = preprocessorModule.parse(app, file);
          }
          catch (e) {
            throw `❌  ${appName} failed to parse ${file}. Please ensure that it is coded correctly.\n`.red + util.inspect(e);
            reject();
          }
        }

        // create build directory and write js file
        fse.mkdirsSync(path.dirname(newFile));
        fs.openSync(newFile, 'a'); // create it if it does not already exist
        if (fs.readFileSync(newFile, 'utf8') !== newJs) {
          fs.writeFile(newFile, newJs, function(err) {
            if (err) {
              throw `❌  ${appName} failed to write new JS file ${newFile}`.red + util.inspect(err);
              reject();
            }
            else {
              if (!app.get('params').suppressLogs.rooseveltLogs) {
                console.log(`📝  ${appName} writing new JS file ${newFile}`.green);
              }
              resolve();
            }
          });
        }
        else {
          resolve();
        }
      });
    }(file));
  });

  Promise.all(promises)
    .then(function() {
      callback();
    })
    .catch(function(e) {
      console.error(e);
      process.exit();
    });
};
