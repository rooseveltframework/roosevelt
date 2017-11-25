
Roosevelt MVC web framework
===

[![Greenkeeper badge](https://badges.greenkeeper.io/rooseveltframework/roosevelt.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/rooseveltframework/roosevelt.svg?branch=master)](https://travis-ci.org/rooseveltframework/roosevelt) [![npm](https://img.shields.io/npm/v/roosevelt.svg)](https://www.npmjs.com/package/roosevelt)

Roosevelt is a web application development framework based on [Express](http://expressjs.com). Roosevelt abstracts all the crusty boilerplate necessary to build a typical web application using Express and provides a uniform [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) structure for your app.

Named for [the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time.html), whose facial hair is a curly brace, Roosevelt's main goal is to be the easiest web framework to learn and use on the [Node.js](https://nodejs.org) stack by setting sane defaults while also providing easy ways to override the defaults and tap into the full potential of Express.

By default Roosevelt integrates [Teddy](https://github.com/rooseveltframework/teddy) for HTML templating, [LESS](http://lesscss.org) for CSS preprocessing, and [UglifyJS](http://lisperator.net/uglifyjs/) for JS minification. But you can use other templating systems, CSS preprocessors, or JS minifiers if you like, as Roosevelt is easy to configure.

Roosevelt will also automatically validate your HTML in development mode using a local instance of the [Nu HTML Checker](https://www.npmjs.com/package/vnu-jar). <img src='http://i.imgur.com/s4YUHNG.png' alt='' title='All life begins with Nu and ends with Nu...' width='16' height='16' style='image-rendering: -moz-crisp-edges;image-rendering: -o-crisp-edges;image-rendering: -webkit-optimize-contrast;image-rendering: crisp-edges;-ms-interpolation-mode: nearest-neighbor;'>

![Teddy Roosevelt's facial hair is a curly brace.](https://github.com/rooseveltframework/generator-roosevelt/blob/master/generators/app/templates/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

*Note: this is documentation for the latest version of Roosevelt. If you need API documentation for a previous version of Roosevelt, [look here](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt).*

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
- [Documentation for previous versions of Roosevelt](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt)

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular [Node.js](https://nodejs.org) web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of [Express](http://expressjs.com) is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- [Teddy](https://github.com/rooseveltframework/teddy) HTML templates are much easier to read and maintain than popular alternatives.
- Automatic HTML validation.
- [LESS](http://lesscss.org) and [UglifyJS](http://lisperator.net/uglifyjs/) preconfigured out of the box to intelligently minify your external facing CSS and JS files.
- Built-in, easy to use interface to [browserify](http://browserify.org) bundling for frontend JS modularization using the Node.js module `exports` and `require` syntax.



Create and run a Roosevelt app
===

First you will need to install [Node.js](http://nodejs.org) and the [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html). (The JDK is required for the local HTML validator feature.)

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
- If this is your first time running a Node.js application, be sure to follow npm's instructions for [setting npm permissions correctly](https://docs.npmjs.com/getting-started/fixing-npm-permissions) so you can run npm commands without elevated privileges.

**Ubuntu:**

- Install build-essential: `sudo apt-get install build-essential`
- You may also need to `sudo apt-get remove gyp` if you already have gyp installed. Ubuntu's gyp is incompatible with common JS modules.
- If this is your first time running a Node.js application, be sure to follow npm's instructions for [setting npm permissions correctly](https://docs.npmjs.com/getting-started/fixing-npm-permissions) so you can run npm commands without elevated privileges.

Once you have a sane developmemt environment, you can proceed with the standard install procedure below.


Install Roosevelt and create an app
---

Globally install [Yeoman](http://yeoman.io):

```
npm i -g yo
```

Globally install the [Roosevelt Yeoman generator](https://github.com/rooseveltframework/generator-roosevelt):

```
npm i -g generator-roosevelt
```

Create a Roosevelt app:

```
yo roosevelt
```

Then follow the prompts.

Afterward...

Install dependencies:

```
npm i
```

Run in development mode:

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

Run your app with a detached HTML validator instead of the default attached validator (runs validator as a separate process in the background; process must be manually killed later, see below):

```
npm run dev detach-validator
```

After running your app with a detached HTML validator, use this command to shut down the HTML validator:

```
npm run kill-validator
```
Or if your app is configured to detach the validator by default, you can force the validator to be attached like so:

```
npm run dev attach-validator
```

Run your app on two CPUs (default is `max`):

```
node app.js -cores 2
```

Remove all symlinks and directories in your app generated by Roosevelt (will prompt to confirm before deleting any files):

```
npm run cleanup
```
Scan current Roosevelt config in `package.json` and warn about any params that don't match the current API:

```
npm run audit
```
Default directory structure
===

- `app.js`: main app file. Feel free to rename this, but make sure to update `package.json`'s reference to it.
- `mvc`: folder for models, views, and controllers. All configurable via params (see below).
  - `controllers`: folder for controller files.
  - `models`: folder for model files.
  - `views`: folder for view files.
- `node_modules`: a standard folder where all modules your app depends on (such as Roosevelt) are installed to. This folder is created by the `npm install` command.
- `package.json`: a standard file in Node.js apps for configuring your app.
- `public`: all contents within this folder will be exposed as static files.
- `statics`: folder for source CSS, images, JS files, and other statics. Some of the contents of this folder are symlinked to from public, which you can configure (see below).
  - `css`: folder for source CSS files.
  - `images`: folder for source image files.
  - `js`: folder for source JS files.
- `.gitignore`: a standard file which contains a list of files and folders to ignore if your project is in a  git repo.



Default .gitignore
---

The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before using a fresh Roosevelt app in your git repo.

Some notable things ignored by default and why:

- `public`: It's recommended that you don't create files in this folder manually, but instead use the `symlinksToStatics` feature detailed below to expose folders in your `statics` directory via auto-generated symlinks.
- `.build`: By default Roosevelt will compile LESS and JS files down to minified versions in `statics/.build` when the server starts. As such, it's not recommended to place files in the build directory manually.
- `node_modules`: This folder will be auto-generated when you run the `npm install` step to set up your app. Since some modules you might include later in your app can be platform-specific and are compiled for your OS during the install step, it's generally not recommended to commit the `node_modules` folder to git.



Configure your app with parameters
===

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional. As such, by default, all that's in app.js is this:

```js
require('roosevelt')().startServer();
```

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

Also, while it is recommended that you pass params to Roosevelt via `package.json` under `"rooseveltConfig"`, you can also pass params programmatically via Roosevelt's constructor like so:

```js
require('roosevelt')({
  paramName: 'paramValue',
  param2:    'value2',
  etc:       'etc'
}).startServer();
```

This is particularly useful for setting params that can't be defined in `package.json` such as event handlers (see below).

App behavior parameters
---

- `port`: The port your app will run on. Can also be defined using `HTTP_PORT` or `NODE_PORT` environment variable.
  - Default: *[String]* `43711`
- `appDir`: Project root. Can be useful to change in testing environments like [Mocha](http://mochajs.org) or if you just want to specify it by hand.
  -  Default: *[String]* The directory where your project `package.json` is located.
  -  Example customization:


````json
{
  "appDir": "/some/other/path"
}
````

- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx. This setting is ignored in development mode.
  - Default: *[Boolean]* `true`
- `suppressLogs`: Accepts an object containing two related parameters:
  - `httpLogs`: *[Boolean]* When set to true, Roosevelt will not log HTTP requests to the console. 
  - `rooseveltLogs`: *[Boolean]* When set to true, Roosevelt will not log app status to the console.
  - Default: *[Object]*


 ```json
{
  "httpLogs": false,
  "rooseveltLogs": false
}
 ```

- `noMinify`: Disables HTML minification as well as the minification step in supporting CSS and JS compilers. Automatically enabled during development mode. Can also be passed as the command line argument `-no-minify` in production mode.
  - Default: *[Boolean]* `false`
- `enableValidator`: Enables or disables the built-in HTML validator in development mode.
  - Default: *[Boolean]* `false`
  - If enabled, it can be disabled for individual requests by sending the request header `Partial` with the value set to `true` or by passing `_disableValidator` to the model and setting it to `true`. This is configurable with the `validatorExceptions` param (see below).
  - You can also force the validator off in `dev` mode regardless of app settings with `npm run dev disable-validator`.
  - You can also force the validator on in `prod` mode regardless of app settings with `npm run dev enable-validator`.
- `validatorExceptions`: Use this to customize the name of the request header or model value that is used to disable the HTML validator.
  - Default: *[Object]*


```json
{
  "requestHeader": "Partial",
  "modelValue": "_disableValidator"
}
```

- `htmlValidator`: Params to send to [html-validator](https://github.com/zrrrzzt/html-validator#usage) if the validator is enabled:
  - `format`: *[String]* This is the formatting of the returned data. It [supports](https://github.com/zrrrzzt/html-validator#usage) JSON (default), HTML, XHTML, XML, GNU and text.
  - `port`: *[Number]* Port to spawn the validator process on.
  - `separateProcess`: *[Boolean]* When set to true, the HTML validator will run detached (separate from the node process) by default. You can kill the process by running `npm run kill-validator`.
  - `suppressWarnings`: *[Boolean]* When set to true, validation warnings will be hidden and only errors will be shown.
  - Default:


```json
{
  "format": "text",
  "port": 8888,
  "separateProcess": false,
  "suppressWarnings": false
}
```

- `multipart`: Settings to pass along to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing. Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the `uploadDir` when the request ends automatically. To keep any, be sure to move them before the request ends. To disable multipart forms entirely, set this option to false.
  - Default: *[Boolean]*


```json
{
  "multiples": true
}
```

- `maxLagPerRequest`: Maximum amount of time in miliseconds a given request is allowed to take before being interrupted with a 503 error. (See [node-toobusy](https://github.com/STRML/node-toobusy).)
  - Default: *[Number]* `70` (70ms)
- `shutdownTimeout`: Maximum amount of time in miliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.
  - Default: *[Number]* `30000` (30 seconds)
- `bodyParserUrlencodedParams`: Parameters to supply to [body-parser.urlencoded](https://github.com/expressjs/body-parser#bodyparserurlencodedoptions).
  - Default:


```json
{
  "extended": true
}
```

- `bodyParserJsonParams`: Parameters to supply to [body-parser.json](https://github.com/expressjs/body-parser#bodyparserjsonoptions).
  - Default: *[Object]* `{}`



HTTPS parameters
---

- `https`: Run a HTTPS server using Roosevelt.
  - Default: *[Boolean]* `false`
- `httpsOnly`: Disable HTTP server when running a HTTPS server.
  - Default: *[Boolean]* `false`
- `httpsPort`: The port your app will run a HTTPS server on, if HTTPS is enabled. Can also be defined using the `HTTPS_PORT` environment variable.
  - Default: *[Number]* `43733`
- `pfx`: Specify whether or not your app will use pfx or standard certification.
  - Default: *[Boolean]* `false`
- `keyPath`: Stores the file paths of specific key/certificate to be used by the server.
  - Default: `null`
  - When set: *[Object]*  `pfx`, `key`, `cert` -- use one of {`pfx`} or {`key`, `cert`}.
- `passphrase`: *[String]* Supply the HTTPS server with the password for the certificate being used, if necessary.
  - Default: `null`
- `ca`: *[String]* Certificate authority to match client certificates against, as a file path or array of file paths. Can also be a full certificate string, requiring `cafile` to be `false`.
  - Default: `null`
- `cafile`: Whether or not the entry supplied by `ca` is a file.
  - Default: *[Boolean]* `true`
- `requestCert`: Request a certificate from a client and attempt to verify it.
  - Default: *[Boolean]* `false`
- `rejectUnauthorized`: Upon failing to authorize a user with supplied CA(s), reject their connection entirely.
  - Default: *[Boolean]* `false`



MVC parameters
---

- `modelsPath`: Relative path on filesystem to where your model files are located.
  - Default: *[String]* `"mvc/models"`
- `viewsPath`: Relative path on filesystem to where your view files are located.
  - Default: *[String]* `"mvc/views"`
- `viewEngine`: What templating engine to use, formatted as `"fileExtension: nodeModule"`. 
  - Default: *[String]* `"html: teddy"`
  - Also by default the module [teddy](https://github.com/rooseveltframework/teddy) is marked as a dependency in `package.json`.
  - Set to `"none"` *[String]* to use no templating engine.
  - To use multiple templating systems, supply an array of engines to use in the same string format. Each engine you use must also be marked as a dependency in your app's `package.json`. Whichever engine you supply first with this parameter will be considered the default. 
  - Example configuration using multiple templating systems: *[Object]* 


```json
{
  "viewEngine": [
    "html: teddy",
    "mustache: mustache",
    "handlebars: handlebars",
    "ejs: ejs"
  ]
}
```

- `controllersPath`: Relative path on filesystem to where your controller files are located.
  - Default: *[String]* `"mvc/controllers"`



Error page parameters
---

- `error404`: Relative path on filesystem to where your "404 Not Found" controller is located. If you do not supply one, Roosevelt will use its default 404 controller instead.
  - Default: *[String]* `"404.js"`
- `error5xx`: Relative path on filesystem to where your "Internal Server Error" controller is located. If you do not supply one, Roosevelt will use its default controller instead.
  - Default: *[String]* `"5xx.jx"`
- `error503`: Relative path on filesystem to where your "503 Service Unavailable" controller is located. If you do not supply one, Roosevelt will use its default 503 controller instead.
  - Default: *[String]* `"503.js"`



Statics parameters
---

- `staticsRoot`: Relative path on filesystem to where your source static assets are located. By default this folder will not be made public, but is instead meant to store unprocessed or uncompressed source assets that will later be preprocessed and exposed in `public`.
  - Default: *[String]* `"statics"`
- `htmlMinify`: Params to send to [express-minify-html](https://github.com/melonmanchan/express-minify-html), an Express middleware for [html-minifier](https://github.com/kangax/html-minifier):
  - Set `override` *[Boolean]* to false to disable minification entirely.
  - For other usage, see [express-minify-html usage](https://github.com/melonmanchan/express-minify-html#usage).
  - Default: *[Object]* 


```json
{
  "override": true,
  "exception_url": false,
  "htmlMinifier": {
    "html5": true
  }
}
```

- `cssPath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and stored elsewhere when the app is started.
  - Default: *[String]* `"css"`
- `cssCompiler`: Which Roosevelt CSS preprocessor middleware, if any, to use.
  - Your chosen Roosevelt CSS preprocessor module must be marked as a dependency in your app's `package.json`.
  - Set to `"none"` *[String]* to use no CSS preprocessor.
  - The default preprocessor is [roosevelt-less](https://github.com/rooseveltframework/roosevelt-less), which is marked as a dependency in `package.json` on freshly generated Roosevelt apps. See [roosevelt-less usage](https://github.com/rooseveltframework/roosevelt-less#usage) for details on what params are available.
  - Default configuration: *[Object]* 


```json
{
  "nodeModule": "roosevelt-less",
  "params": {
    "cleanCSS": {
      "advanced": true,
      "aggressiveMerging": true
    },
    "sourceMap": null
  }
```

- `cssCompilerWhitelist`: Whitelist of CSS files to compile as an array. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.
  - Default: `null` (compiles all CSS files, if a CSS preprocessing is enabled)
  - Example: *[String]* `less/example.less:styles/example.min.css` (compiles `less/example.less` into `styles/example.min.css`)
- `cssCompiledOutput`: Where to place compiled CSS files. This folder will be symlinked into `public` by default.
  - Default: *[String]* `".build/css"`
- `jsPath`: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unminified JS source files which will be minified and stored elsewhere when the app is started.
  - Default: *[String]* `"js"`
- `browserifyBundles`: Declare one or more files in your `jsPath` to be [browserify](http://browserify.org) bundles via its [bundle method](https://github.com/substack/node-browserify#browserifyfiles--opts). Use of browserify in Roosevelt is optional. If no bundles are defined here, the browserify step will be skipped.
  - Default: *[Array]* `[]`
  - `env` param: *[String]* bundle only in `dev` or `prod` mode. Omitting `env` will result in bundling in both modes.
  - `params` param: *[Object]* the [browserify params](https://github.com/browserify/browserify#methods) to send to browserify. If it is not set, these default params will be sent: `{"paths": your jsPath}`
  - Examples: *[Array]* of *[Objects]*


Browserify bundle example declaring one bundle:

```json
[
  {
    "outputFile": "bundle.js",
    "files": [
      "landingPage.js", 
      "main.js", 
      "etc.js"
    ], 
    "params": {
      "someOpt": 
      "someValue"
    }
  }
]
```

Browserify bundle example declaring one bundle only used in `dev` mode:

```json
[
  {
    "outputFile": "bundle.js", 
    "env": "dev", 
    "files": [
      "landingPage.js", 
      "main.js", 
      "etc.js"
    ], 
    "params": {
      "someOpt": "someValue"
    }
  }
]
```

Browserify bundle example declaring multiple bundles:

```json
[
  {
    "outputFile": "bundle1.js", 
    "files": [
      "landingPage.js", 
      "main.js", 
      "etc.js"
    ], 
    "params": {
      "someOpt": "someValue"
    }
  }, 
  {
    "outputFile": "bundle2.js", 
    "files": [
      "somethingElse.js", 
      "anotherThing.js", 
      "etc.js"
    ]
  }, 
  etc...
]
```

- `bundledJsPath`: Subdirectory within `jsPath` where you would like [browserify](http://browserify.org) to deposit bundled JS files it produces (if you use browserify).
  - Default: *[String]* `".bundled"`
- `exposeBundles`: Whether or not to copy the `bundledJsPath` directory to your build directory (defined below in `jsCompiledOutput`).
  - Default: *[Boolean]* `true`
- `jsCompiler`: Which Roosevelt JS minifier middleware, if any, to use. 
  - Your chosen Roosevelt JS minifier module must also be marked as a dependency in your app's `package.json`. 
  - Set to `"none"` *[String]* to use no JS minifier. 
  - `showWarnings` param: *[Boolean]* Set to true to display compiler module warnings.
  - The default minifier is [roosevelt-uglify](https://github.com/rooseveltframework/roosevelt-uglify), which is marked as a dependency in `package.json` on freshly generated Roosevelt apps. See [roosevelt-uglify usage](https://github.com/rooseveltframework/roosevelt-uglify#usage) for details on what params are available.
    - The Roosevelt team also maintains [roosevelt-closure](https://github.com/rooseveltframework/roosevelt-closure), an alternative to roosevelt-uglify.
  - Default configuration: *[Object]* 


```json
{
  "nodeModule": "roosevelt-uglify",
  "showWarnings": false, 
  "params": {}
}
```

- `jsCompilerWhitelist`: Whitelist of JS files to compile as an array. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.
  - Default: `null` (compiles all JS files, if a JS minifier is enabled)
  - Example: *[String]* `library-name/example.js:lib/example.min.js` (compiles `library-name/example.js` into `lib/example.min.js`)
- `jsCompiledOutput`: Where to place compiled JS files. This folder will be symlinked into `public` by default.
  - Default: *[String]* `".build/js"`
- `nodeEnv`: *[String]* Param to override the `NODE_ENV` environment variable.
  - Default: `undefined`


Public folder parameters
---

- `publicFolder`: All files and folders specified in this path will be exposed as static files.
  -  Default: *[String]* `"public"`
- `favicon`: Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.
  - Default: *[String]* `"images/favicon.ico"`
  - Disable favicon support by supplying `"none"` *[String]* to this parameter.
- `symlinksToStatics`: Array of folders from `staticsRoot` to make symlinks to in your public folder, formatted as either `"linkName: linkTarget"` (whitespace optional) or simply `"linkName"` if the link target has the same name as the desired link name.
  - Default: *[Array]* of *[Strings]*


```json
[
  "css: .build/css", 
  "images",
  "js: .build/js"
]
```

- `versionedStatics`: If set to true, Roosevelt will prepend your app's version number from `package.json` to your statics URLs. Versioning your statics is useful for resetting your users' browser cache when you release a new version.
  - Default: *[Boolean]* `false`
- `versionedCssFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable containing your app's version number from `package.json`. Enable this option by supplying an object with the member variables `fileName` and `varName`.
  - Default: `undefined`.
  - Example usage (with roosevelt-less): *[Object]* 


```json
{
  "fileName": "_version.less",
  "varName": "appVersion"
}
```

Assuming the default Roosevelt configuration otherwise, this will result in a file `statics/css/_version.less` with the following content:

```less
/* do not edit; generated automatically by Roosevelt */ @appVersion: '0.1.0';
```

- `alwaysHostPublic`:  By default in production mode Roosevelt will not expose the public folder. It's recommended instead that you host the public folder yourself directly through another web server, such as Apache or nginx. However, if you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set this setting to true.
  - Default: *[Boolean]* `false`



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

An example would be creating a reusable controller for "404 Not Found" pages:

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

Views by default are [Teddy](https://github.com/rooseveltframework/teddy) templates. See the Teddy documentation for information about how to author Teddy templates.

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

Additionally the Roosevelt constructor returns the following object:

| Roosevelt object members | Description                              |
| ------------------------ | ---------------------------------------- |
| `expressApp`             | The [Express app](http://expressjs.com/api.html#express) created by Roosevelt. |
| `httpServer`             | The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. `httpServer` is also available as a direct child of `app`, e.g. `app.httpServer`. |
| `httpsServer`            | The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt. `httpsServer` is also available as a direct child of `app`, e.g. `app.httpsServer`. |
| `initServer`             | Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. |
| `startServer`            | Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config. |


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
npm t
```

If you want to hack on the CLI tool which generates new Roosevelt apps, see [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).


Help wanted!
---

There is plenty of opportunity to help improve Roosevelt if you're interested in lending a hand. If you'd like to help, take a look at the [open issues](https://github.com/rooseveltframework/roosevelt/issues?state=open) and submit a pull request!

# Documentation for previous versions of Roosevelt

- *[0.9.x](https://github.com/rooseveltframework/roosevelt/blob/15031010974475f7baf2355b9e06a977675db269/README.md)*
- *[0.8.x](https://github.com/rooseveltframework/roosevelt/blob/a99c44edc022fee3c0e49b8f0f81d41f8957db27/README.md)*
- *[0.7.x](https://github.com/rooseveltframework/roosevelt/blob/b57533979d2962b524d217d125f3abafb7b5a94c/README.md)*
- *[0.6.x](https://github.com/rooseveltframework/roosevelt/blob/44bd29c2739785c7a1a4396287d49e8d9733af2b/README.md)*
- Older… [here be dragons](https://en.wikipedia.org/wiki/Here_be_dragons).