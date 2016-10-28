Roosevelt MVC web framework
===

[![NPM version](https://badge.fury.io/js/roosevelt.png)](http://badge.fury.io/js/roosevelt) [![Dependency Status](https://gemnasium.com/kethinov/roosevelt.png)](https://gemnasium.com/kethinov/roosevelt) [![Gittip](http://img.shields.io/gittip/kethinov.png)](https://www.gittip.com/kethinov/)

Roosevelt is a web application development framework based on [Express](http://expressjs.com). Roosevelt abstracts all the crusty boilerplate necessary to build a typical Express app and provides a uniform [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) structure for your app.

Named for [the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time_p5.html) whose facial hair just so happens to look like a curly brace, Roosevelt's main goal is to be the easiest JS-based web framework to learn and use by setting sane defaults while also providing easy ways to override the defaults and tap into the full potential of Express.

By default Roosevelt integrates [Teddy](https://github.com/kethinov/teddy) for HTML templating, [LESS](http://lesscss.org) for CSS preprocessing, and [Closure Compiler](https://developers.google.com/closure/compiler) for JS minification. But you can use other templating systems, CSS preprocessors, or JS minifiers if you like, as Roosevelt is easy to configure.

![Teddy Roosevelt's facial hair is a curly brace.](https://raw.github.com/kethinov/mkroosevelt/master/sampleApp/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

Table of contents
===

- [Why use Roosevelt](https://github.com/kethinov/roosevelt#why-use-roosevelt)
- [Create and run a Roosevelt app](https://github.com/kethinov/roosevelt#create-and-run-a-roosevelt-app)
  - [Platform specific prerequisites](https://github.com/kethinov/roosevelt#platform-specific-prerequisites)
  - [Install Roosevelt and create an app](https://github.com/kethinov/roosevelt#install-roosevelt-and-create-an-app)
  - [Other ways to run Roosevelt apps](https://github.com/kethinov/roosevelt#other-ways-to-run-roosevelt-apps)
- [Default directory structure](https://github.com/kethinov/roosevelt#default-directory-structure)
  - [Default .gitignore](https://github.com/kethinov/roosevelt#default-gitignore)
- [Configure your app with parameters](https://github.com/kethinov/roosevelt#configure-your-app-with-parameters)
  - [App behavior parameters](https://github.com/kethinov/roosevelt#app-behavior-parameters)
  - [MVC parameters](https://github.com/kethinov/roosevelt#mvc-parameters)
  - [Error page parameters](https://github.com/kethinov/roosevelt#error-page-parameters)
  - [Statics parameters](https://github.com/kethinov/roosevelt#statics-parameters)
  - [Public folder parameters](https://github.com/kethinov/roosevelt#public-folder-parameters)
  - [Events](https://github.com/kethinov/roosevelt#events)
  - [Event list](https://github.com/kethinov/roosevelt#event-list)
- [Making controller files](https://github.com/kethinov/roosevelt#making-controller-files)
- [Making model files](https://github.com/kethinov/roosevelt#making-model-files)
- [Making view files](https://github.com/kethinov/roosevelt#making-view-files)
- [Express variables exposed by Roosevelt](https://github.com/kethinov/roosevelt#express-variables-exposed-by-roosevelt)
- [Express middleware and other configurations automatically provided by Roosevelt](https://github.com/kethinov/roosevelt#express-middleware-and-other-configurations-automatically-provided-by-roosevelt)
- [Warning: Roosevelt is beta software!](https://github.com/kethinov/roosevelt#warning-roosevelt-is-beta-software)
- [Contributing to Roosevelt](https://github.com/kethinov/roosevelt#contributing-to-roosevelt)
  - [Help wanted!](https://github.com/kethinov/roosevelt#help-wanted)
- [License](https://github.com/kethinov/roosevelt#license)

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular JS-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of [Express](http://expressjs.com) is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- [Teddy](https://github.com/kethinov/teddy) HTML templates are much easier to read and maintain than popular alternatives.
- [LESS](http://lesscss.org) and [Closure Compiler](https://developers.google.com/closure/compiler) preconfigured out of the box to intelligently minify your external facing CSS and JS files.

Create and run a Roosevelt app
===

First you will need to install [Node.js](http://nodejs.org) or [io.js](https://iojs.org). Then you might need to install some other stuff depending on what operating system you're running.

Platform specific prerequisites
---

**Windows:**

- Install python 2.7.6 (not 3.x, [that doesn't work](https://code.google.com/p/gyp/issues/detail?id=36)). [Download that here](http://www.python.org/download/releases/2.7.6).
- Add python to your PATH. [Instructions for that are here](http://stackoverflow.com/questions/6318156/adding-python-path-on-windows-7).
- Install Visual Studio (payware) or Visual Studio Express for Windows Desktop (registerware): [Download that here](http://www.visualstudio.com/downloads/download-visual-studio-vs).

**Mac:**

- Install [Xcode](https://developer.apple.com/xcode).

**Ubuntu:**

- Install build-essential: `sudo apt-get install build-essential`
- You may also need to `sudo apt-get remove gyp` if you already have gyp installed. Ubuntu's gyp is incompatible with common JS modules.

If you intend to use Roosevelt's default JS minifier (Closure Compiler), then you should also make sure to install the [Java JRE](http://www.oracle.com/technetwork/java/javase/downloads/index.html) as well. If you don't, then Roosevelt will install it as a dependency of your app which will bloat the size of your app by several tens of megabytes.

Once you have a sane developmemt environment, you can proceed with the standard install procedure below.

Install Roosevelt and create an app
---

First install the command line tool globally (may require admin or root privileges):

```
npm install -g mkroosevelt
```

Use the command line tool to create a sample app:

```
mkroosevelt myapp
```

Inside your new `myapp` folder you'll find a `bin` directory with the following files:

```
mac.command
unix.sh
windows.bat
```

Open the one relevant to whichever operating system you're running. That will install all the dependencies and start your new app!

If you want to do that manually instead using the console, then change into your new app's directory and then install dependencies:

```
cd myapp
npm install
```

Then run your app:

```
node app.js
```

Other ways to run Roosevelt apps
---

Run your app in production mode:

```
export NODE_ENV=production && node app.js
```

Run your app on two CPUs:

```
node app.js -cores 2
```

Run your app on all your CPUs:

```
node app.js -cores max
```

While developing your app, a more convenient way to run the app is to use the `npm start` script.

The `npm start` script will run your app through [nodemon](https://github.com/remy/nodemon) and will automatically restart whenever you modify any JS, JSON, LESS, or HTML files.

Make sure you install nodemon first via `npm install -g nodemon` (may require admin or root privileges) and then simply execute this command:

```
npm start
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
- `lib`: Optional folder for any modules, utility libraries, or other dependencies your app may require which aren't in npm, symlinked to node_modules.
- `node_modules`: a standard folder where all modules your app depends on (such as Roosevelt) are installed to. This folder is created by the `npm install` command.
  - `models`: symlink to `mvc/models` so you can `require('models/yourModel')` anywhere in your code without specifying a relative path. Roosevelt will create this symlink for you.
  - `lib`: symlink to `lib` so you can `require('lib/yourLib')` anywhere in your code without using a relative path. If the `lib` folder is present, Roosevelt will create this symlink.
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

- `port`: The port your app will run on. Can also be defined using `NODE_PORT` environment variable.
  - Default: `43711`
- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx. This setting is ignored in development mode.
  - Default: `true`
- `disableLogger`: When this option is set to true, Roosevelt will not log HTTP requests to the console.
  - Default: `false`
- `noMinify`: Disables the minification step in (supporting) CSS and JS compilers. Useful during dev mode. Can also be passed as the command line argument `-no-minify`.
  - Default: `false`
- `multipart`: Settings to pass along to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing. To disable multipart forms entirely, set this option to false.
  - Default: `{'multiples': true}`
- ~~`maxLagPerRequest`: Maximum amount of time in miliseconds a given request is allowed to take before being interrupted with a 503 error. (See [node-toobusy](https://github.com/lloyd/node-toobusy)</a>)~~ *([Temporarily disabled](https://github.com/lloyd/node-toobusy/issues/45))*
  - Default: `2000` (2 seconds)
- `shutdownTimeout`: Maximum amount of time in miliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.
  - Default: `30000` (30 seconds)
  
HTTPS parameters
---

- `https`: Run an HTTPS server using Roosevelt.
  - Default: `false`
- `httpsOnly`: If running an HTTPS server, determines whether or not the default HTTP server will be disabled
  - Default: `false`
- `httpsPort`: The port your app will run an HTTPS server on, if enabled.
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
- `limit`: Controls the maximum request body size with the [body-parser](https://www.npmjs.com/package/body-parser). If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the [bytes](https://www.npmjs.com/package/bytes) library for parsing. 
  - Default: `100kb` 

MVC parameters
---

- `modelsPath`: Relative path on filesystem to where your model files are located.
  - Default: `mvc/models`
- `modelsNodeModulesSymlink`: Name of the symlink to make in `node_modules` pointing to your models directory. Set to `false` to disable making this symlink.
  - Default: `models`
- `viewsPath`: Relative path on filesystem to where your view files are located.
  - Default: `mvc/views`
- `viewEngine`: What templating engine to use, formatted as `'fileExtension: nodeModule'`. Supply an array of engines to use in that format in order to make use of multiple templating engines. Each engine you use must also be marked as a dependency in your app's package.json. Whichever engine you supply first with this parameter will be considered the default. Set to `none` to use no templating engine.
  - Default: `html: teddy`
  - Also by default the module [teddy](https://github.com/kethinov/teddy) is marked as a dependency in package.json.
- `controllersPath`: Relative path on filesystem to where your controller files are located.
  - Default: `mvc/controllers`

Utility library parameters
---

- `libPath`: Relative path on filesystem to where your optional utility library files are located. Defaults to `lib` if not set.
- `libPathNodeModulesSymlink`: Name of the symlink to make in `node_modules` pointing to your `lib` directory. Set to `false` to disable making this symlink. Defaults to `lib` if not set.

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
- `cssPath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and stored elsewhere when the app is started.
  - Default: `css`
- `cssCompiler`: Which CSS preprocessor, if any, to use. Must also be marked as a dependency in your app's package.json. Set to `none` to use no CSS preprocessor.
  - Default: `{nodeModule: 'roosevelt-less', params: {compress: true}}`.
  - Also by default the module [roosevelt-less](https://github.com/kethinov/roosevelt-less) is marked as a dependency in package.json.
- `cssCompilerWhitelist`: Whitelist of CSS files to compile as an array. Leave undefined to compile all files.
  - Default: `undefined`
- `cssCompiledOutput`: Where to place compiled CSS files. This folder will be made public by default.
  - Default: `.build/css`
- `jsPath`: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unminified JS source files which will be minified and stored elsewhere when the app is started.
  - Default: `js`
- `jsCompiler`: Which JS minifier, if any, to use. Must also be marked as a dependency in your app's package.json. Set to `none` to use no JS minifier.
  - Default: `{nodeModule: 'roosevelt-closure', params: {compilation_level: 'ADVANCED_OPTIMIZATIONS'}}`.
  - Also by default the module [roosevelt-closure](https://github.com/kethinov/roosevelt-closure) is marked as a dependency in package.json.
- `jsCompilerWhitelist`: Whitelist of JS files to compile as an array. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.
  - Default: `undefined`
  - Example: `library-name/example.js:lib/example.min.js` (customizes both file path and file name of minified file)
- `jsCompiledOutput`: Where to place compiled JS files. This folder will be made public by default.
  - Default: `.build/js`

Public folder parameters
---

- `publicFolder`: All files and folders specified in this path will be exposed as static files.
  -  Default: `public`
- `favicon`: Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.
  -  Default: `images/favicon.ico`
- `symlinksToStatics`: Array of folders from `staticsRoot` to make symlinks to in your public folder, formatted as either `'linkName: linkTarget'` or simply `'linkName'` if the link target has the same name as the desired link name.
  - Default: `['css: .build/css', 'images', 'js: .build/js']` (whitespace optional)
- `versionedStatics`: If set to true, Roosevelt will prepend your app's version number from package.json to your statics URLs. Versioning your statics is useful for resetting your users' browser cache when you release a new version.
  - Default: `false`
- `versionedCssFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable exposing your app's version number from package.json. Enable this option by supplying an object with the member variables `fileName` and `varName`.
  - Default: `undefined`.
  - Example usage: `{fileName: 'version.less', varName: 'appVersion'}`.
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

Making model files
===

Since the above example requires a model file named `dataModel`, you will need to make that too. To do that, place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
module.exports = {some: 'data'};
```

Making view files
===

Views are [Teddy](https://github.com/kethinov/teddy) templates. See the Teddy documentation for information about how to author Teddy templates.

You can also use different templating engines by tweaking Roosevelt's parameters (see above parameter documentation).

Express variables exposed by Roosevelt
===

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.


Express variable | Description
--- | ---
`express` | The [express](http://expressjs.com) module.
*viewEngine* e.g. `teddy` by default | Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module.
`formidable` | The [formidable](https://github.com/felixge/node-formidable) module. Used for handling multipart forms.
`appName` | The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied.
`appVersion` | The version number of your app derived from `package.json`.
`appDir` | The directory the main module is in.
`package` | The contents of `package.json`.
`staticsRoot` | Full path on the file system to where your app's statics folder is located.
`publicFolder` | Full path on the file system to where your app's public folder is located.
`cssPath` | Full path on the file system to where your app's CSS source files are located.
`jsPath` | Full path on the file system to where your app's JS source files are located.
`cssCompiledOutput` | Full path on the file system to where your app's minified CSS files are located.
`jsCompiledOutput` | Full path on the file system to where your app's minified JS files are located.
`modelsPath` | Full path on the file system to where your app's models folder is located.
`viewsPath` | Full path on the file system to where your app's views folder is located.
`controllersPath` | Full path on the file system to where your app's controllers folder is located.
`params` | The params you sent to Roosevelt.
`port` | Port Roosevelt is running on.

Additionally the Roosevelt constructor returns the following object:

Roosevelt object | Description
--- | ---
`expressApp` | The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
`httpServer` | The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. `httpServer` is also available as a direct child of `app`, e.g. `app.httpServer`.
`startServer` | Calls [http.listen()](http://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback) to start the web server with Roosevelt's config.

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

If you want to hack on the CLI tool, see [mkroosevelt](https://github.com/kethinov/mkroosevelt).

Help wanted!
---

There is plenty of opportunity to help improve Roosevelt if you're interested in lending a hand. If you'd like to help, take a look at the [open issues](https://github.com/kethinov/roosevelt/issues?state=open) and submit a pull request!
