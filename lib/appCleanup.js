// cleanup symlinks and generated files in roosevelt apps

var appDir = require('./getAppDir'),
    utils = require('./utils'),
    rimraf = require('rimraf'),
    path = require('path'),
    package = require(appDir + 'package.json'),
    appName = package.name || 'Roosevelt',
    params = package.rooseveltConfig,
    statics = params.staticsRoot.substr(-1) === path.sep ? params.staticsRoot : params.staticsRoot + path.sep,
    jsPath = params.jsPath.substr(-1) === path.sep ? params.jsPath : params.jsPath + path.sep,
    publicDir = appDir + params.publicFolder,
    compiledJsDir,
    compiledCssDir,
    bundledJsDir = appDir + statics + jsPath + params.bundledJsPath;


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

// remove public directory
if (utils.fileExists(publicDir)) {
  console.log(`🗑  Removing directory: ${publicDir}`);
  rimraf.sync(publicDir);
}

// remove compiled js directory
if (utils.fileExists(compiledJsDir)) {
  console.log(`🗑  Removing directory: ${compiledJsDir}`);
  rimraf.sync(compiledJsDir);
}

// remove compiled css directory
if (utils.fileExists(compiledCssDir)) {
  console.log(`🗑  Removing directory: ${compiledCssDir}`);
  rimraf.sync(compiledCssDir);
}

// remove bundled js directory
if (utils.fileExists(bundledJsDir)) {
  console.log(`🗑  Removing directory: ${bundledJsDir}`);
  rimraf.sync(bundledJsDir);
}

console.log('✔️  Cleanup finished.'.bold);
