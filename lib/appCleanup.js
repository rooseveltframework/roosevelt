// cleanup symlinks and generated files in roosevelt apps

var appDir = require('./getAppDir'),
    utils = require('./utils'),
    rimraf = require('rimraf'),
    readline = require('readline'),
    path = require('path'),
    package = require(appDir + 'package.json'),
    appName = package.name || 'Roosevelt',
    params = package.rooseveltConfig,
    statics = params.staticsRoot.substr(-1) === path.sep ? params.staticsRoot : params.staticsRoot + path.sep,
    jsPath = params.jsPath.substr(-1) === path.sep ? params.jsPath : params.jsPath + path.sep,
    publicDir = appDir + params.publicFolder,
    compiledJsDir,
    compiledCssDir,
    bundledJsDir = appDir + statics + jsPath + params.bundledJsPath,
    rmDirs = [],
    rl;

if (params.jsCompiledOutput.includes(path.sep)) {
  compiledJsDir = appDir + statics + params.jsCompiledOutput.split(path.sep)[0];
}
else {
  compiledJsDir = appDir + statics + params.jsCompiledOutput;
}

if (params.cssCompiledOutput.includes(path.sep)) {
  compiledCssDir = appDir + statics + params.cssCompiledOutput.split(path.sep)[0];
}
else {
  compiledCssDir = appDir + statics + params.cssCompiledOutput;
}

console.log(`🛁  Cleaning up ${appName}...`.bold);

// check for public directory
if (utils.fileExists(publicDir)) {
  rmDirs.push(publicDir);
  console.log(`🔦  Found directory: ${publicDir}`);
}

// check for compiled js directory
if (utils.fileExists(compiledJsDir)) {
  rmDirs.push(compiledJsDir);
  console.log(`🔦  Found directory: ${compiledJsDir}`);
}

// check for compiled css directory (if unique)
if (compiledJsDir !== compiledCssDir) {
  if (utils.fileExists(compiledCssDir)) {
    rmDirs.push(compiledCssDir);
    console.log(`🔦  Found directory: ${compiledCssDir}`);
  }
}

// check for bundled js directory
if (utils.fileExists(bundledJsDir)) {
  rmDirs.push(bundledJsDir);
  console.log(`🔦  Found directory: ${bundledJsDir}`);
}

// if directories are found, prompt user before deletion
if (rmDirs[0]) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`❔  Do you want to remove ${rmDirs[1] ? 'these directories' : 'this directory'}? [Y/n]`.bold, (answer) => {
    if (answer === ('y' || 'Y' || 'yes' || 'Yes') || !answer) {
      rmDirs.forEach(function(dir) {
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
