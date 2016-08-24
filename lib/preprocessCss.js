// css preprocessor

require('colors');

var fs = require('fs'),
    wrench = require('wrench'),
    prequire = require('parent-require');

module.exports = function(app) {
  var params = app.get('params'),
      preprocessor = params.cssCompiler.nodeModule,
      preprocessorModule,
      cssFiles = [],
      cssDirectories = [],
      versionFile,
      versionCode = '/* do not edit; generated automatically by Roosevelt */ ';

  if (params.cssCompiler === 'none') {
    return;
  }

  // require preprocessor
  try {
    preprocessorModule = prequire(preprocessor);
  }
  catch (err) {
    console.error(((app.get('appName') || 'Roosevelt') + ' failed to include your CSS preprocessor! Please ensure that it is declared properly in your package.json and that it has been properly insalled to node_modules.').red);
    console.error(err);
  }

  // get css files to compile
  if (params.cssCompilerWhitelist) {
    cssFiles = params.cssCompilerWhitelist;
  }
  else {
    cssFiles = wrench.readdirSyncRecursive(app.get('cssPath'));

    cssDirectories = cssFiles.filter(function(arrayElement) {
      if (fs.statSync(app.get('cssPath') + arrayElement).isDirectory()) {
        return arrayElement;
      }
    });
    cssFiles = cssFiles.filter(function(arrayElement) {
      if (fs.statSync(app.get('cssPath') + arrayElement).isFile()) {
        return arrayElement;
      }
    });
  }

  // make css directory if not present
  if (!fs.existsSync(app.get('cssPath'))) {
    wrench.mkdirSyncRecursive(app.get('cssPath'));
    console.log(((app.get('package').name || 'Roosevelt') + ' making new directory ' + app.get('cssPath').replace(app.get('appDir'), '')).yellow);
  }

  // make css compiled output directory if not present
  if (params.cssCompiler && params.cssCompiler.nodeModule && !fs.existsSync(app.get('cssCompiledOutput'))) {
    wrench.mkdirSyncRecursive(app.get('cssCompiledOutput'));
    console.log(((app.get('package').name || 'Roosevelt') + ' making new directory ' + app.get('cssCompiledOutput').replace(app.get('appDir'), '')).yellow);
  }

  // write versionedCssFile
  if (params.versionedCssFile) {
    if (!params.versionedCssFile.fileName || typeof params.versionedCssFile.fileName !== 'string') {
      console.error(((app.get('appName') || 'Roosevelt') + ' failed to write versionedCssFile file! fileName missing or invalid').red);
    }
    else if (!params.versionedCssFile.varName || typeof params.versionedCssFile.varName !== 'string') {
      console.error(((app.get('appName') || 'Roosevelt') + ' failed to write versionedCssFile file! varName missing or invalid').red);
    }
    else {
      versionFile = app.get('cssPath') + params.versionedCssFile.fileName;
      versionCode += preprocessorModule.versionCode(app);

      fs.openSync(versionFile, 'a'); // create it if it does not already exist
      if (fs.readFileSync(versionFile, 'utf8') !== versionCode) {
        fs.writeFile(versionFile, versionCode, function(err) {
          if (err) {
            console.error(((app.get('appName') || 'Roosevelt') + ' failed to write versionedCssFile file!').red);
            console.error(err);
          }
          else {
            console.log(((app.get('appName') || 'Roosevelt') + ' writing new versionedCssFile to reflect new version ' + app.get('appVersion') + ' to ' + versionFile).green);
          }
        });
      }
    }
  }

  // make css compiled output subdirectory tree
  cssDirectories.forEach(function(directory) {
    wrench.mkdirSyncRecursive(app.get('cssCompiledOutput') + directory);
  });

  cssFiles.forEach(function(file) {
    (function(file) {
      if (file.charAt(0) === '.' || file === 'Thumbs.db') {
        return;
      }
      preprocessorModule.parse(app, file, function(err, newFile, newCss) {
        if (err) {
          console.error(((app.get('appName') || 'Roosevelt') + ' failed to parse ' + file + '. Please ensure that it is coded correctly.').red);
          console.error(err);
        }
        else {
          fs.openSync(newFile, 'a'); // create it if it does not already exist
          if (fs.readFileSync(newFile, 'utf8') !== newCss) {
            fs.writeFile(newFile, newCss, function(err) {
              if (err) {
                console.error(((app.get('appName') || 'Roosevelt') + ' failed to write new CSS file ' + newFile).red);
                console.error(err);
              }
              else {
                console.log(((app.get('appName') || 'Roosevelt') + ' writing new CSS file ' + newFile).green);
              }
            });
          }
        }
      });
    })(file);
  });
};