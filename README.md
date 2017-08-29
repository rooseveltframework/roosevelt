
Roosevelt MVC web framework
===

[![Greenkeeper badge](https://badges.greenkeeper.io/rooseveltframework/roosevelt.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/rooseveltframework/roosevelt.svg?branch=master)](https://travis-ci.org/rooseveltframework/roosevelt) [![npm](https://img.shields.io/npm/v/roosevelt.svg)](https://www.npmjs.com/package/roosevelt)

Roosevelt is a web application development framework based on [Express](http://expressjs.com). Roosevelt abstracts all the crusty boilerplate necessary to build a typical web application using Express and provides a uniform [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) structure for your app.

Named for [the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time.html) whose facial hair just so happens to look like a curly brace, Roosevelt's main goal is to be the easiest JS-based web framework to learn and use by setting sane defaults while also providing easy ways to override the defaults and tap into the full potential of Express.

By default Roosevelt integrates [Teddy](https://github.com/rooseveltframework/teddy) for HTML templating, [LESS](http://lesscss.org) for CSS preprocessing, and [Closure Compiler](https://developers.google.com/closure/compiler) for JS minification. But you can use other templating systems, CSS preprocessors, or JS minifiers if you like, as Roosevelt is easy to configure.

Roosevelt will also automatically validate your HTML using a local instance of the [Nu HTML Checker](https://www.npmjs.com/package/vnu-jar). <img src='http://i.imgur.com/s4YUHNG.png' alt='' title='All life begins with Nu and ends with Nu...' width='16' height='16' style='image-rendering: -moz-crisp-edges;image-rendering: -o-crisp-edges;image-rendering: -webkit-optimize-contrast;image-rendering: crisp-edges;-ms-interpolation-mode: nearest-neighbor;'>

![Teddy Roosevelt's facial hair is a curly brace.](https://github.com/rooseveltframework/generator-roosevelt/blob/master/generators/app/templates/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")


Table of contents
===

- [Why use Roosevelt](https://github.com/rooseveltframework/roosevelt#why-use-roosevelt)
- [Create and run a Roosevelt app](https://github.com/rooseveltframework/roosevelt#create-and-run-a-roosevelt-app)
  - [Platform specific prerequisites](https://github.com/rooseveltframework/roosevelt#platform-specific-prerequisites)
  - [Install Roosevelt and create an app](https://github.com/rooseveltframework/roosevelt#install-roosevelt-and-create-an-app)
  - [Other useful scripts](https://github.com/rooseveltframework/roosevelt#other-useful-scripts)
- [Default directory structure](https://github.com/rooseveltframework/roosevelt#default-directory-structure)
  - [Default .gitignore](https://github.com/rooseveltframework/roosevelt#default-gitignore)
- [Configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters)
  - [App behavior parameters](https://github.com/rooseveltframework/roosevelt#app-behavior-parameters)
  - [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters)
  - [Error page parameters](https://github.com/rooseveltframework/roosevelt#error-page-parameters)
  - [Statics parameters](https://github.com/rooseveltframework/roosevelt#statics-parameters)
  - [Public folder parameters](https://github.com/rooseveltframework/roosevelt#public-folder-parameters)
  - [Events](https://github.com/rooseveltframework/roosevelt#events)
  - [Event list](https://github.com/rooseveltframework/roosevelt#event-list)
- [Making controller files](https://github.com/rooseveltframework/roosevelt#making-controller-files)
- [Making model files](https://github.com/rooseveltframework/roosevelt#making-model-files)
- [Making view files](https://github.com/rooseveltframework/roosevelt#making-view-files)
- [Express variables exposed by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-variables-exposed-by-roosevelt)
- [Express middleware and other configurations automatically provided by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-middleware-and-other-configurations-automatically-provided-by-roosevelt)
- [Warning: Roosevelt is beta software!](https://github.com/rooseveltframework/roosevelt#warning-roosevelt-is-beta-software)
- [Contributing to Roosevelt](https://github.com/rooseveltframework/roosevelt#contributing-to-roosevelt)
  - [Help wanted!](https://github.com/rooseveltframework/roosevelt#help-wanted)

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular JS-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of [Express](http://expressjs.com) is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- [Teddy](https://github.com/rooseveltframework/teddy) HTML templates are much easier to read and maintain than popular alternatives.
- Automatic HTML validation.
- [LESS](http://lesscss.org) and [Closure Compiler](https://developers.google.com/closure/compiler) preconfigured out of the box to intelligently minify your external facing CSS and JS files.



Create and run a Roosevelt app
===

First you will need to install [Node.js](http://nodejs.org) and the [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html). (The JDK is required for the local HTML validator feature.)

If this is your first time running a Node.js application, be sure to follow npm's instructions for [setting npm permissions correctly](https://docs.npmjs.com/getting-started/fixing-npm-permissions) so you can run npm commands without elevated privileges. 

Then you might need to install some other stuff depending on what operating system you're running.


Platform specific prerequisites
---

Some dependencies require Python or a C++ compiler. The procedure for getting these on your system varies by operating system:

**Windows:**

- Install python 2.7.6 (not 3.x, [that doesn't work](https://code.google.com/p/gyp/issues/detail?id=36)). [Download that here](http://www.python.org/download/releases/2.7.6).
- Add python to your PATH. [Instructions for that are here](http://stackoverflow.com/questions/6318156/adding-python-path-on-windows-7).
- Install Visual Studio (payware) or Visual Studio Express for Windows Desktop (registerware): [Download that here](http://www.visualstudio.com/downloads/download-visual-studio-vs).
- Windows users are advised to run their command line as administrator due to [symlink creation requiring elevated command prompt in Windows](https://github.com/rooseveltframework/roosevelt/issues/120).

**Mac:**

- Install [Xcode](https://developer.apple.com/xcode).

**Ubuntu:**

- Install build-essential: `sudo apt-get install build-essential`
- You may also need to `sudo apt-get remove gyp` if you already have gyp installed. Ubuntu's gyp is incompatible with common JS modules.

Once you have a sane developmemt environment, you can proceed with the standard install procedure below.


Install Roosevelt and create an app
---

Globally install [Yeoman](http://yeoman.io).

```
npm i -g yo
```

Globally install Roosevelt Yeoman generator.

```
npm i -g generator-roosevelt
```

Create a Roosevelt app.

```
yo roosevelt
```

Then follow the prompts.

Afterward:

Install dependencies.

```
npm i
```

Run in development mode.

```
npm run dev
```

Or run in production mode:

```
npm run prod
```

Note: `npm start` is aliased to `npm run prod`.

Other useful scripts
---

Run your app with an attached HTML validator (HTML validator is attached by default):

```
npm run dev attach
```

Run your app with a detached HTML validator (runs validator as a separate process in the background; process must be manually killed later, see below):

```
npm run dev detach-validator
```

After running your app with a detached HTML validator, use this command to shut down the HTML validator:

```
npm run kill-validator
```
Run your app on two CPUs:

```
node app.js -cores 2
```

Run your app on all your CPUs (this is the default behavior):

```
node app.js -cores max
```

Remove all symlinks and directories generated by Roosevelt:

```
npm run cleanup
```
Scan current package.json Roosevelt configuration and warn about any issues:

```
npm run audit
```
Default directory structure
===

- `app.js`: main app file. Feel free to rename this, but make sure to update package.json's reference to it.
- `bin`: folder with operating system-specfic executables for your app.
  - `mac.command`: open this in Mac OS X to start your app graphically.
  - `unix.sh`: open this in UNIX-like environments like Ubuntu or other Linux distros to start your app graphically.
  - `windows.bat`: open this in Windows to start your app graphically.
- `mvc`: folder for models, views, and controllers.
  - `controllers`: folder for controller files.
  - `models`: folder for model files.
  - `views`: folder for view files.
- `lib`: Optional folder for any modules, utility libraries, or other dependencies your app may require which aren't in npm.
- `node_modules`: a standard folder where all modules your app depends on (such as Roosevelt) are installed to. This folder is created by the `npm install` command.
- `package.json`: a standard file for configuring your app.
- `public`: all contents within this folder will be exposed as static files.
- `statics`: folder for CSS, images, JS files, and other statics. Some of the contents of this folder are symlinked to from public, which you can configure (see below).
  - `css`: folder for CSS files.
  - `images`: folder for image files.
  - `js`: folder for JS files.
- `.gitignore`: a standard file which contains a list of files and folders to ignore if your project is in a  git repo.



Default .gitignore
---

The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before using a fresh Roosevelt app in your git repo.

Some notable things ignored by default and why:

- `public`: It's recommended that you don't create files in this folder manually, but instead use the `symlinksToStatics` feature detailed below to expose folders in your `statics` directory via auto-generated symlinks.
- `.build`: By default Roosevelt will compile LESS and JS files down to minified versions in `statics/.build` when the server starts. As such, it's not recommended to place files in the build directory manually.
- `node_modules`: This folder will be auto-generated when you run the `npm install` step to set up your app. Since some modules you might include later in your app can be platform-specific and are compiled for your OS during the install step, it's generally <a href='https://npmjs.org/doc/faq.html'>not recommended</a> to commit the `node_modules` folder to git.



Configure your app with parameters
===

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional. As such, by default, all that's in app.js is this:

```js
require('roosevelt')().startServer();
```

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

Inside `app.js`, you can pass any of the below optional parameters to Roosevelt via its constructor like so:

```js
require('roosevelt')({
  paramName: 'paramValue',
  param2:    'value2',
  etc:       'etc'
}).startServer();
```

Each param can also be defined in `package.json` under `"rooseveltConfig"`.


App behavior parameters
---
- `appDir`: Useful to change when using a test environment like Mocha or if you just want to specify it by hand.
  -  Default: The directory where your project package.json is located. `{appDir: 'User/Path/to/project'}`
- `port`: The port your app will run on. Can also be defined using `HTTP_PORT` or `NODE_PORT` environment variable.
  - Default: `43711`
- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx. This setting is ignored in development mode.
  - Default: `true`
- `disableLogger`: When this option is set to true, Roosevelt will not log HTTP requests to the console.
  - Default: `false`
- `noMinify`: Disables HTML minification as well as the minification step in (supporting) CSS and JS compilers. Automatically enabled during dev mode. Can also be passed as the command line argument `-no-minify`.
  - Default: `false`
- `enableValidator`: Enables or disables the built-in HTML validator in dev mode.
  - Default: `false`
  - e.g. force validator off in dev mode regardless of app settings: `npm run dev disable-validator`
  - e.g. force validator on in prod mode regardless of app settings: `npm run dev enable-validator`
- `htmlValidator`: Params to send to [html-validator](https://github.com/zrrrzzt/html-validator#usage) (if `enableValidator` is set to true). When `suppressWarnings` is set to true validation warnings will be hidden and only errors will be shown. When `separateProcess` is set to true the HTML validator will run separately from the node process.
  - Default:  `{port: '8888', separateProcess: false, format: 'text', suppressWarnings: false}`
  - Can be disabled for individual requests by sending the request header `Partial` with the value set to `true` or by passing `_disableValidator` to the model and setting it to `true`.
- `validatorExceptions`: Use this to customize the name of the request header or model value that is used to disable the HTML validator.
  - Default: `{'requestHeader': 'Partial', 'modelValue': '_disableValidator'}`
- `multipart`: Settings to pass along to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing. Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the `uploadDir` when the request ends automatically. To keep any, be sure to move them before the request ends. To disable multipart forms entirely, set this option to false.
  - Default: `{'multiples': true}`
- `maxLagPerRequest`: Maximum amount of time in miliseconds a given request is allowed to take before being interrupted with a 503 error. (See [node-toobusy](https://github.com/STRML/node-toobusy))
  - Default: `70` (70ms)
- `shutdownTimeout`: Maximum amount of time in miliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.
  - Default: `30000` (30 seconds)
- `bodyParserUrlencodedParams`: Supply parameters to [body-parser.urlencoded](https://github.com/expressjs/body-parser#bodyparserurlencodedoptions).
  - Default: `{extended: true}`
- `bodyParserJsonParams`: Supply parameters to [body-parser.json](https://github.com/expressjs/body-parser#bodyparserjsonoptions).
  - Default: `{}`
- `suppressLogs`: When this option is set to true, Roosevelt will not log app status to the console. Useful when running Roosevelt in a testing context.
  - Default: `false`



HTTPS parameters
---

- `https`: Run an HTTPS server using Roosevelt.
  - Default: `false`
- `httpsOnly`: If running an HTTPS server, determines whether or not the default HTTP server will be disabled
  - Default: `false`
- `httpsPort`: The port your app will run a HTTPS server on, if enabled. Can also be defined using `HTTPS_PORT` environment variable.
  - Default: `43733`
- `pfx`: Specify whether or not your app will use pfx or standard certification.
  - Default: `false`
- `keyPath`: Stores the file paths of specific key/certificate to be used by the server.
  - Object values: `pfx`, `key`, `cert` -- use one of {`pfx`} or {`key`, `cert`}
  - Default: `null`
- `passphrase`: Supply the HTTPS server with the password for the certificate being used, if necessary.
  - Default: `null`
- `ca`: Certificate authority to match client certificates against, as a file path or array of file paths.
  - Default: `null`
- `requestCert`: Request a certificate from a client and attempt to verify it.
  - Default: `false`
- `rejectUnauthorized`: Upon failing to authorize a user with supplied CA(s), reject their connection entirely.
  - Default: `false`



MVC parameters
---

- `modelsPath`: Relative path on filesystem to where your model files are located.
  - Default: `mvc/models`
- `viewsPath`: Relative path on filesystem to where your view files are located.
  - Default: `mvc/views`
- `viewEngine`: What templating engine to use, formatted as `'fileExtension: nodeModule'`. Supply an array of engines to use in that format in order to make use of multiple templating engines. Each engine you use must also be marked as a dependency in your app's package.json. Whichever engine you supply first with this parameter will be considered the default. Set to `none` to use no templating engine.
  - Default: `html: teddy`
  - Also by default the module [teddy](https://github.com/rooseveltframework/teddy) is marked as a dependency in package.json.
- `controllersPath`: Relative path on filesystem to where your controller files are located.
  - Default: `mvc/controllers`



Error page parameters
---

- `error404`: Relative path on filesystem to where your "404 Not Found" controller is located. If you do not supply one, Roosevelt will use its default 404 controller instead.
  - Default: `404.js`
- `error5xx`: Relative path on filesystem to where your "Internal Server Error" controller is located. If you do not supply one, Roosevelt will use its default controller instead.
  - Default: `5xx.jx`
- `error503`: Relative path on filesystem to where your "503 Service Unavailable" controller is located. If you do not supply one, Roosevelt will use its default 503 controller instead.
  - Default: `503.js`



Statics parameters
---

- `staticsRoot`: Relative path on filesystem to where your static assets are located. By default this folder will not be made public, but is instead meant to store unprocessed or uncompressed source assets.
  - Default: `statics`
- `htmlMinify`: Configuration for [html-minifier](https://github.com/kangax/html-minifier). Set `override` to `false` to disable minification entirely. Set `exception_url` to disable for [specific routes](https://github.com/melonmanchan/express-minify-html#usage). Use `htmlMinifier` to pass [supported parameters](https://github.com/kangax/html-minifier#options-quick-reference) to html-minifier.
  - Default: "htmlMinify": {'override': true, 'exception_url': false, 'htmlMinifier': {'html5': true}}
- `cssPath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and stored elsewhere when the app is started.
  - Default: `css`
- `cssCompiler`: Which CSS preprocessor, if any, to use. Must also be marked as a dependency in your app's package.json. Set to `none` to use no CSS preprocessor.
  - Default: `{nodeModule: 'roosevelt-less', params: {compress: true}}`.
  - Also by default the module [roosevelt-less](https://github.com/rooseveltframework/roosevelt-less) is marked as a dependency in package.json.
- `cssCompilerWhitelist`: Whitelist of CSS files to compile as an array. Leave undefined to compile all files.
  - Default: `undefined`
- `cssCompiledOutput`: Where to place compiled CSS files. This folder will be made public by default.
  - Default: `.build/css`
- `jsPath`: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unminified JS source files which will be minified and stored elsewhere when the app is started.
  - Default: `js`
- `bundledJsPath`: Subdirectory within `jsPath` where you would like [browserify](http://browserify.org) to deposit bundled JS files it produces (if you use browserify).
  - Default: `.bundled`
- `exposeBundles`: Whether or not to copy the `bundledJsPath` directory to your build directory (defined below in `jsCompiledOutput`).
  - Default: `true`
- `browserifyBundles`: Declare [browserify](http://browserify.org) bundles: one or more files in your `jsPath` for browserify to bundle via its [bundle method](https://github.com/substack/node-browserify#browserifyfiles--opts). Use of browserify is optional. If no bundles are defined here, the browserify step will be skipped.
  - Default: `[]`
  - Example declaring one bundle: `[{outputFile: "bundle.js", files: ["landingPage.js", "main.js", "etc.js"], params: {someOpt: "someValue"}}]`
  - Example declaring one bundle only used in dev mode `[{outputFile: "bundle.js", env: "dev", files: ["landingPage.js", "main.js", "etc.js"], params: {someOpt: "someValue"}}]`
  - Example declaring multiple bundles: `[{outputFile: "bundle1.js", files: ["landingPage.js", "main.js", "etc.js"], params: {someOpt: "someValue"}}, {outputFile: "bundle2.js", files: ["somethingElse.js", "anotherThing.js", "etc.js"]}, etc...]`
  - Note: Omitting `env` will result in bundling in both modes.
  - Note: `params` is optional. If it is not set, these default params will be sent: `{paths: yourJsPath}`
- `jsCompiler`: Which JS minifier, if any, to use. Must also be marked as a dependency in your app's package.json. Set to `none` to use no JS minifier.
  - Default: `{nodeModule: "roosevelt-closure", showWarnings: false, params: {compilationLevel: "ADVANCED"}}`.
  - Also by default the module [roosevelt-closure](https://github.com/rooseveltframework/roosevelt-closure) is marked as a dependency in package.json.
  - Note: Set `showWarnings` to `true` to display compiler warnings.
- `jsCompilerWhitelist`: Whitelist of JS files to compile as an array. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.
  - Default: `undefined`
  - Example: `library-name/example.js:lib/example.min.js` (customizes both file path and file name of minified file)
- `jsCompiledOutput`: Where to place compiled JS files. This folder will be made public by default.
  - Default: `.build/js`
- `nodeEnv`: Param to override the `NODE_ENV` environment variable.
  - Default: `undefined`


Public folder parameters
---

- `publicFolder`: All files and folders specified in this path will be exposed as static files.
  -  Default: `public`
- `favicon`: Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.
  - Default: `images/favicon.ico`
  - Disable favicon support by supplying `none` to this parameter.
- `symlinksToStatics`: Array of folders from `staticsRoot` to make symlinks to in your public folder, formatted as either `'linkName: linkTarget'` or simply `'linkName'` if the link target has the same name as the desired link name.
  - Default: `['css: .build/css', 'images', 'js: .build/js']` (whitespace optional)
- `versionedStatics`: If set to true, Roosevelt will prepend your app's version number from package.json to your statics URLs. Versioning your statics is useful for resetting your users' browser cache when you release a new version.
  - Default: `false`
- `versionedCssFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable exposing your app's version number from package.json. Enable this option by supplying an object with the member variables `fileName` and `varName`.
  - Default: `undefined`.
  - Example usage: `{fileName: '_version.less', varName: 'appVersion'}`.
- `alwaysHostPublic`:  By default in production mode Roosevelt will not expose the public folder. It's recommended instead that you host the public folder yourself directly through another web server, such as Apache or nginx. However, if you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set this setting to true.
  - Default: `false`



Events
---

Roosevelt also provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
require('roosevelt')({
  onServerStart: function(app) { /* do something */ }
});
```


Event list
---

- `onServerInit(app)`: Fired when the server begins starting, prior to any actions taken by Roosevelt.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onServerStart(app)`: Fired when the server starts.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onReqStart(req, res, next)`: Fired at the beginning of each new request.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.
  - `next`: Callback to continue with the request. Must be called to continue the request.
- `onReqBeforeRoute(req, res, next)`: Fired just before executing the controller.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.
  - `next`: Callback to continue with the request. Must be called to continue the request.
- `onReqAfterRoute(req, res)`: Fired after the request ends.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.



Making controller files
===

Controller files are just <a href='http://expressjs.com/api.html#app.VERB'>standard Express routes</a>. A route is the term <a href='http://expressjs.com'>Express</a> uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`.

To make a new controller, just make a new file in the controllers directory. For example:

```js
module.exports = function(app) { // app is the Express app created by Roosevelt

  // standard Express route
  app.route('/about').get(function(req, res) {

    // load a data model
    var model = require('models/dataModel');

    // render a Teddy template and pass it the model
    res.render('about', model);
  });
};
```

Sometimes it is also useful to separate controller logic from your routing. This can be done by creating a reusable controller module.

A typical example would be creating a reusable controller for "404 not found" pages:

```js
// reusable controller "notFound.js"
module.exports = function(app, req, res) {
  var model = { content: 'Cannot find this page' };
  res.status(404);
  res.render('404', model);
}
```

Reusable controller modules differ from standard controller modules in that they accept `req` and `res` arguments in addition to `app`. They are meant to be called from within routes rather than define new routes.

This allows them to be called at will in any other controller's route when needed:

```js
// import the "notFound" controller logic previously defined
var throw404 = require('controllers/notFound');

module.exports = function(app) {
  app.route('/whatever').get(function(req, res) {
    
    // test some logic that could fail
    // thus triggering the need for the 404 controller
    if (something) {

      // logic didn't fail
      // so just render the page normally
      var model = require('models/dataModel');
      res.render('whatever', model);
    }
    else {

      // logic failed
      // so throw the 404 by executing your reusable controller
      throw404(app, req, res);
    }
  });
};
```

Making model files
===

Since the above example requires a model file named `dataModel`, you will need to make that too. To do that, place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
module.exports = {some: 'data'};
```


Making view files
===

Views are [Teddy](https://github.com/rooseveltframework/teddy) templates. See the Teddy documentation for information about how to author Teddy templates.

You can also use different templating engines by tweaking Roosevelt's parameters (see above parameter documentation).


Express variables exposed by Roosevelt
===

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.


| Express variable                     | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `express`                            | The [express](http://expressjs.com) module. |
| *viewEngine* e.g. `teddy` by default | Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module. |
| `formidable`                         | The [formidable](https://github.com/felixge/node-formidable) module. Used for handling multipart forms. |
| `appName`                            | The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied. |
| `appVersion`                         | The version number of your app derived from `package.json`. |
| `appDir`                             | The directory the main module is in.     |
| `package`                            | The contents of `package.json`.          |
| `staticsRoot`                        | Full path on the file system to where your app's statics folder is located. |
| `publicFolder`                       | Full path on the file system to where your app's public folder is located. |
| `cssPath`                            | Full path on the file system to where your app's CSS source files are located. |
| `jsPath`                             | Full path on the file system to where your app's JS source files are located. |
| `cssCompiledOutput`                  | Full path on the file system to where your app's minified CSS files are located. |
| `jsCompiledOutput`                   | Full path on the file system to where your app's minified JS files are located. |
| `modelsPath`                         | Full path on the file system to where your app's models folder is located. |
| `viewsPath`                          | Full path on the file system to where your app's views folder is located. |
| `controllersPath`                    | Full path on the file system to where your app's controllers folder is located. |
| `params`                             | The params you sent to Roosevelt.        |
| `port`                               | Port Roosevelt is running on.            |
| `suppressLogs`                       | Whether or not Roosevelt is suppressing console logging. |

Additionally the Roosevelt constructor returns the following object:

| Roosevelt object | Description                              |
| ---------------- | ---------------------------------------- |
| `expressApp`     | The [Express app](http://expressjs.com/api.html#express) created by Roosevelt. |
| `httpServer`     | The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. `httpServer` is also available as a direct child of `app`, e.g. `app.httpServer`. |
| `httpsServer`    | The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt. `httpsServer` is also available as a direct child of `app`, e.g. `app.httpsServer`. |
| `initServer`     | Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. |
| `startServer`    | Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config. |


Express middleware and other configurations automatically provided by Roosevelt
===

In addition to exposing a number of variables to Express and providing the MVC interface outlined above, Roosevelt also:

- Includes the [compression](https://github.com/expressjs/compression) middleware.
- Includes the [cookie-parser](https://github.com/expressjs/cookie-parser) middleware.
- Disables `x-powered-by` and `etag`.
- Logs HTTP requests to the console  using [morgan](https://github.com/expressjs/morgan), specifically `morgan('combined')`.
- Includes the [body-parser](https://github.com/expressjs/body-parser) middleware with `bodyParser.json` and `bodyParser.urlencoded({extended: true})`.
- Includes the [method-override](https://github.com/expressjs/method-override) middleware.



Warning: Roosevelt is beta software!
===

Not many apps have been written using Roosevelt yet, so it's entirely possible that there will be some significant bugs.

You should not use Roosevelt in production yet unless you're willing to devote some time to fixing any bugs you might find.


Contributing to Roosevelt
===

To contribute back to Roosevelt, fork this repo and clone it to your computer.

To run the unit tests on your code changes, run this command:

```
npm test
```

If you want to hack on the CLI tool, see [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).


Help wanted!
---

There is plenty of opportunity to help improve Roosevelt if you're interested in lending a hand. If you'd like to help, take a look at the [open issues](https://github.com/rooseveltframework/roosevelt/issues?state=open) and submit a pull request!
