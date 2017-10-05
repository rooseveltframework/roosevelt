// cleanup symlinks and generated files in roosevelt apps

var appDir = require('./getAppDir'),
    utils = require('./utils'),
    rimraf = require('rimraf'),
    readline = require('readline'),
    path = require('path'),
    package = require(appDir + 'package.json'),
    appName = package.name || 'Roosevelt',
    params = package.rooseveltConfig,
    statics = params.staticsRoot,
    jsPath = params.jsPath,
    publicDir = path.join(appDir, params.publicFolder),
    compiledJsDir = path.join(appDir, statics, params.jsCompiledOutput.split(path.sep)[0] || params.jsCompiledOutput),
    compiledCssDir = path.join(appDir, statics, params.cssCompiledOutput.split(path.sep)[0] || params.cssCompiledOutput),
    bundledJsDir = path.join(appDir, statics, jsPath, params.bundledJsPath),
    cleanupDirs = [],
    rl;

console.log(`🛁  Cleaning up ${appName}...`.bold);

// check for public directory
if (utils.fileExists(publicDir)) {
  cleanupDirs.push(publicDir);
  console.log(`🔦  Found directory: ${publicDir}`);
}

// check for compiled js directory
if (utils.fileExists(compiledJsDir)) {
  cleanupDirs.push(compiledJsDir);
  console.log(`🔦  Found directory: ${compiledJsDir}`);
}

// check for compiled css directory (if unique)
if (compiledJsDir !== compiledCssDir) {
  if (utils.fileExists(compiledCssDir)) {
    cleanupDirs.push(compiledCssDir);
    console.log(`🔦  Found directory: ${compiledCssDir}`);
  }
}

// check for bundled js directory
if (bundledJsDir !== path.join(appDir, statics, jsPath)) {
  if (utils.fileExists(bundledJsDir)) {
    cleanupDirs.push(bundledJsDir);
    console.log(`🔦  Found directory: ${bundledJsDir}`);
  }
}

// if directories are found, prompt user before deletion
if (cleanupDirs[0]) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`❔  Do you want to remove ${cleanupDirs[1] ? 'these directories' : 'this directory'}? [y/N]`.bold, (answer) => {
    if (answer === ('y' || 'Y' || 'yes' || 'Yes')) {
      cleanupDirs.forEach(function(dir) {
        console.log(`🗑  Removing directory: ${dir}`);
        rimraf.sync(dir);
      });
    }
    rl.close();
    console.log('✔️  Cleanup finished.'.bold);
  });
}
else {
  console.log('✔️  Cleanup finished.'.bold);
}
