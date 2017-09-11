// css preprocessor

require('colors');

var fs = require('fs'),
    fse = require('fs-extra'),
    klawSync = require('klaw-sync'),
    prequire = require('parent-require'),
    path = require('path'),
    utils = require('./utils');

module.exports = function(app, callback) {
  var params = app.get('params'),
      appName = app.get('appName'),
      cssPath = app.get('cssPath'),
      cssCompiledOutput = app.get('cssCompiledOutput'),
      preprocessor = params.cssCompiler.nodeModule,
      preprocessorModule,
      cssFiles = [],
      cssDirectories = [],
      versionFile,
      versionCode = '/* do not edit; generated automatically by Roosevelt */ ',
      promises = [];

  if (params.cssCompiler === 'none') {
    return;
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor);
  }
  catch (err) {
    console.error(`❌  ${appName} failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.`.red);
    console.error(err);
  }

  // get css files to compile
  if (params.cssCompilerWhitelist) {
    cssFiles = params.cssCompilerWhitelist;
  }
  else {
    cssFiles = klawSync(cssPath);

    cssDirectories = cssFiles.filter(function(arrayElement) {
      arrayElement = arrayElement.path;
      if (fs.statSync(arrayElement).isDirectory()) {
        return arrayElement;
      }
    });
    cssFiles = cssFiles.filter(function(arrayElement) {
      arrayElement = arrayElement.path;
      if (fs.statSync(arrayElement).isFile()) {
        return arrayElement;
      }
    });
  }

  // make css directory if not present
  if (!utils.fileExists(cssPath)) {
    fse.mkdirsSync(cssPath);
    if (!app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${cssPath}`.yellow);
    }
  }

  // make css compiled output directory if not present
  if (params.cssCompiler && params.cssCompiler.nodeModule && !utils.fileExists(cssCompiledOutput)) {
    fse.mkdirsSync(cssCompiledOutput);
    if (!app.get('suppressLogs')) {
      console.log(`📁  ${appName} making new directory ${cssCompiledOutput}`.yellow);
    }
  }

  // write versionedCssFile
  if (params.versionedCssFile) {
    if (!params.versionedCssFile.fileName || typeof params.versionedCssFile.fileName !== 'string') {
      console.error(`❌  ${appName} failed to write versionedCssFile file! fileName missing or invalid`.red);
    }
    else if (!params.versionedCssFile.varName || typeof params.versionedCssFile.varName !== 'string') {
      console.error(`❌  ${appName} failed to write versionedCssFile file! varName missing or invalid'`.red);
    }
    else {
      versionFile = path.join(cssPath, params.versionedCssFile.fileName);
      versionCode += preprocessorModule.versionCode(app);

      fs.openSync(versionFile, 'a'); // create it if it does not already exist
      if (fs.readFileSync(versionFile, 'utf8') !== versionCode) {
        fs.writeFile(versionFile, versionCode, function(err) {
          if (err) {
            console.error(`❌  ${appName} failed to write versionedCssFile file!`.red);
            console.error(err);
          }
          else {
            if (!app.get('suppressLogs')) {
              console.log(`📝  ${appName} writing new versionedCssFile to reflect new version ${app.get('appVersion')} to ${versionFile}`.green);
            }
          }
        });
      }
    }
  }

  // make css compiled output subdirectory tree
  cssDirectories.forEach(function(directory) {
    fse.mkdirsSync(path.join(cssCompiledOutput, directory));
  });

  cssFiles.forEach(function(file) {
    file = file.path ? file.path : file;
    file = path.basename(file);
    promises.push(function(file) {
      return new Promise(function(resolve, reject) {
        if (file.charAt(0) === '.' || file === 'Thumbs.db') {
          resolve();
          return;
        }
        preprocessorModule.parse(app, file, function(err, newFile, newCss) {
          if (err) {
            console.error(`❌  ${appName} failed to parse ${file}. Please ensure that it is coded correctly.`.red);
            console.error(err);
            resolve();
          }
          else {
            fs.openSync(newFile, 'a'); // create it if it does not already exist
            if (fs.readFileSync(newFile, 'utf8') !== newCss) {
              fs.writeFile(newFile, newCss, function(err) {
                if (err) {
                  console.error(`❌  ${appName} failed to write new CSS file ${newFile}`.red);
                  console.error(err);
                }
                else {
                  if (!app.get('suppressLogs')) {
                    console.log(`📝  ${appName} writing new CSS file ${newFile}`.green);
                  }
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
