roosevelt.js [![NPM version](https://badge.fury.io/js/roosevelt.png)](http://badge.fury.io/js/roosevelt) [![Dependency Status](https://gemnasium.com/kethinov/roosevelt.png)](https://gemnasium.com/kethinov/roosevelt) [![Gittip](http://img.shields.io/gittip/kethinov.png)](https://www.gittip.com/kethinov/)
===

Roosevelt is a new web framework for [Node.js](http://nodejs.org) which uses [Teddy](https://github.com/kethinov/teddy) for HTML templating and [LESS](http://lesscss.org) for CSS preprocessing.

Built on [Express](http://expressjs.com), Roosevelt is designed to abstract all the crusty boilerplate necessary to build a typical Express app, sets sane defaults with mechanisms for override, and provides a uniform [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) structure for your app.

![Teddy Roosevelt's facial hair is a curly brace.](https://raw.github.com/kethinov/roosevelt/master/sampleApp/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

Table of contents
===

- [Why use Roosevelt](#why-use-roosevelt)
- [Create and run a Roosevelt app](#create-and-run-a-roosevelt-app)
  - [Platform specific prerequisites](#platform-specific-prerequisites)
  - [Install Roosevelt and create an app](#install-roosevelt-and-create-an-app)
  - [Other ways to run Roosevelt apps](#other-ways-to-run-roosevelt-apps)
- [Default directory structure](#default-directory-structure)
  - [Default .gitignore](#default-gitignore)
- [Configure your app](#configure-your-app)
  - [Parameter list](#parameter-list)
  - [Events](#events)
  - [Event list](#event-list)
- [Making controller files](#making-controller-files)
- [Making model files](#making-model-files)
- [Making view files](#making-view-files)
- [Using LESS with Roosevelt](#using-less-with-roosevelt)
- [Express variables exposed by Roosevelt](#express-variables-exposed-by-roosevelt)
- [Warning: Roosevelt is beta software!](#warning-roosevelt-is-beta-software)
- [Dependencies](#dependencies)
- [License](#license)

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular [Node.js](http://nodejs.org)-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of [Express](http://expressjs.com) is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- [Teddy](https://github.com/kethinov/teddy) HTML templates are much easier to read and maintain than popular alternatives.

Create and run a Roosevelt app
===

First you will need to install [Node.js](http://nodejs.org). However, some platforms require additional steps to get started developing your app.

Platform specific prerequisites
---

**Windows:**

- Install python 2.7.6 (not 3.x, that doesn't work). [Download that here](http://www.python.org/download/releases/2.7.6).
- Add python to your PATH. [Instructions for that are here](http://stackoverflow.com/questions/6318156/adding-python-path-on-windows-7).
- Install Visual Studio (payware) or Visual Studio Express for Windows Desktop (registerware): [Download that here](http://www.visualstudio.com/downloads/download-visual-studio-vs).

**Mac:**

- Install [Xcode](https://developer.apple.com/xcode).

**Ubuntu:**

- You may need to `sudo apt-get remove gyp` if you already have gyp installed. Ubuntu's gyp is incompatible with common Node.js modules.

Once you have a sane Node.js developmemt environment, you can proceed with the standard install procedure below.

Install Roosevelt and create an app
---

First install the command line tool globally (may require admin or root privileges):

```
npm install -g roosevelt
```

Use the command line tool to create a sample app:

```
roosevelt create myapp
```

Change into your new app's directory and then install dependencies:

```
cd myapp
npm install
```

Run your app:

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

- `app.js`: main app file.
- `mvc`: folder for models, views, and controllers.
  - `controllers`: folder for controller files.
  - `models`: folder for model files.
  - `views`: folder for view files.
- `node_modules`: a standard Node.js folder where all modules your app depends on (such as Roosevelt) are installed to.
- `package.json`: a standard Node.js file for configuring your app.
- `public`: all contents within this folder will be exposed as statics.
- `statics`: folder for CSS, images, JS files, LESS files, and other statics. Some of the contents of this folder are symlinked to from public, which you can configure (see below).
  - `css`: folder for CSS files.
  - `images`: folder for image files.
  - `js`: folder for JS files.
  - `less`: folder for LESS files.
- `.gitignore`: a standard file which contains a list of files and folders to ignore if your project is in a  git repo.

Default .gitignore
---

The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to liking before using a fresh Roosevelt app in your git repo.

Some notable things ignored by default and why:

- `public`: It's recommended that you don't create files in this folder manually, but instead use the `publicStatics` feature detailed below to expose folders in your `statics` directory via auto-generated symlinks.
- `statics/css`: By default Roosevelt will compile LESS files from the LESS directory down to minified CSS and place them in the CSS directory. As such, it's not recommended to place files in the CSS directory manually. However, if you want to write your CSS files without any CSS preprocessing, then you can remove `statics/css` from `.gitignore` and place files in this folder manually.
- `node_modules`: This folder will be auto-generated when you run the `npm install` step to set up your app. Since some Node.js modules you might include later in your app can be platform-specific and are compiled for your OS during the install step, it's generally <a href='https://npmjs.org/doc/faq.html'>not recommended</a> to commit the `node_modules` folder to git.

Configure your app
===

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional. As such, by default, all that's in app.js is this:

```js
require('roosevelt')();
```
  
Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

Inside `app.js`, you can pass any of the below optional parameters to Roosevelt via its constructor like so:

```js
require('roosevelt')({
  paramName: 'paramValue',
  param2:    'value2',
  etc:       'etc'
});
```

Each param can also be defined in `package.json` under `"rooseveltConfig"`.

Parameter list
---

Param | Description | Default
--- | --- | ---
`port` | The port your app will run on. | Either the `NODE_PORT` environment variable or if that's undefined, then `43711`
`modelsPath` | Relative path on filesystem to where your model files are located. | `mvc/models`
`viewsPath` | Relative path on filesystem to where your view files are located. | `mvc/views`
`controllersPath` | Relative path on filesystem to where your controller files are located. | `mvc/controllers`
`notFoundPage` | Relative path on filesystem to where your "404 Not Found" controller is located. If you do not supply one, Roosevelt will use its default 404 controller instead. | `404.js`
`internalServerErrorPage` | Relative path on filesystem to where your "500 Internal Server Error" controller is located. If you do not supply one, Roosevelt will use its default 500 controller instead. | `500.js`
`serviceUnavailablePage` | Relative path on filesystem to where your "503 Service Unavailable" controller is located. If you do not supply one, Roosevelt will use its default 503 controller instead. | `503.js`
`staticsRoot` | Relative path on filesystem to where your static assets are located. | `statics`
`cssPath` | Relative path on filesystem to where your CSS files are located. | `statics/css`
`lessPath` | Relative path on filesystem to where your LESS files are located. | `statics/less`
`lessCompileWhitelist` | List of files for LESS to compile down to CSS. If none are provided, all LESS files will be compiled down to CSS. | `undefined`
`publicFolder` | All files and folders specified in this path will be exposed as statics. | `public`
`publicStatics` | Static folders to make public. Only these subfolders of your `staticsRoot` will be accessible to end users. | `['css','images','js']`
`prefixStaticsWithVersion` | If set to true, Roosevelt will prepend your app's version number from `package.json` to your statics URLs. Versioning your statics is useful for resetting your users' browser cache when you release a new version. | `false`
`versionNumberLessVar` | When this option is activated, Roosevelt will write a file named `version.less` to your `less` directory containing a LESS variable populated with your app's version number derived from `package.json`. This is useful in conjunction with `prefixStaticsWithVersion`, as it allows you to construct URLs in your LESS files such as `url('/@{staticsVersion}/images/i.png')`, allowing you to version all of your statics at once simply by changing your app's version number in `package.json`. Disabled by default. Activate by supplying a desired variable name as the param.  | `undefined`
`alwaysHostStatics` | By default in production mode Roosevelt will not expose the statics folder. It's recommended instead that you host the statics yourself directly through another web server, such as Apache or nginx. However, if you wish to override this behavior and have Roosevelt expose your statics even in production mode, then set this setting to true. | `false`
`disableLogger` | When this option is set to true, Roosevelt will not log HTTP requests to the console. | `false`
`localhostOnly` | Listen only to requests coming from localhost. | `true`
`disableMultipart` | When this option is set to true, Roosevelt will not parse `enctype['multipart/form-data']` forms. | `false`
`formidableSettings` | Settings to pass along to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api). Formidable is used for multipart form processing. | `undefined`
`maxLagPerRequest` | Maximum amount of time in miliseconds a given request is allowed to take before being interrupted with a 503 error. (See [node-toobusy](https://github.com/lloyd/node-toobusy)</a>) | `70`
`shutdownTimeout` | Maximum amount of time in miliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal. | `30000` (30 seconds)

Events
---

Roosevelt also provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
require('roosevelt')({
  onServerStart: functiom(app) { /* do something */ }
});
```

Event list
---

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
  app.get('/about', function(req, res) {
  
    // use Roosevelt to load a data model
    var model = app.get('model')('about');
    
    // render a Teddy template and pass it the model
    res.render('about', model);
  });
};
```

Making model files
===

Since the above example requires a model file named `about`, you will need to make that too. To do that, place a file named `about.js` in `mvc/models`.

Here's a simple example `about.js` data model:

```js
module.exports = {some: 'data'};
```

Making view files
===

Views are [Teddy](https://github.com/kethinov/teddy) templates. See the Teddy documentation for information about how to author Teddy templates.

Using LESS with Roosevelt
===

Using [LESS](http://lesscss.org) with Roosevelt is optional.

Roosevelt will automatically compile any LESS (`.less`) files in your LESS folder down to minified CSS (`.css`) files of the same name in your CSS folder. *Note: This will overwrite any preexisting CSS files of the same name, so be careful.*

The CSS minifier used by LESS is <a href='http://yui.github.io/yuicompressor/css.html'>YUI Compressor</a>.

Express variables exposed by Roosevelt
===

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.


Express variable | Description
--- | ---
`express` | The [express](http://expressjs.com) Node.js module.
`teddy` | The [teddy](https://github.com/kethinov/teddy) Node.js module. Used for templating.
`formidable` | The [formidable](https://github.com/felixge/node-formidable)  Node.js module. Used for handling multipart forms.
`appName` | The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied.
`appDir` | The directory the main module is in.
`package` | The contents of `package.json`.
`staticsRoot` | Full path on the file system to where your app's statics folder is located.
`publicFolder` | Full path on the file system to where your app's public folder is located.
`modelsPath` | Full path on the file system to where your app's models folder is located.
`viewsPath` | Full path on the file system to where your app's views folder is located.
`controllersPath` | Full path on the file system to where your app's controllers folder is located.
`params` | The params you sent to Roosevelt.
`port` | Port Roosevelt is running on.
`model` | Method to return a model. Calling `app.get('model')('modelName')` will return a specified model from your models folder.

Warning: Roosevelt is beta software!
===

Not many apps have been written using Roosevelt yet, so it's entirely possible that there will be some significant bugs.

You should not use Roosevelt in production yet unless you're willing to devote some time to fixing any bugs you might find.

Dependencies
===

- [express](http://expressjs.com) - a minimal and flexible Node.js web application framework
- [teddy](https://github.com/kethinov/teddy) - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- [less](https://github.com/less/less.js) - LESS CSS preprocessor
- [formidable](https://github.com/felixge/node-formidable) - a Node.js module for parsing form data, especially file uploads
- [wrench](https://github.com/ryanmcgrath/wrench-js) - used for recursive file operations and used by the CLI tool to help you create your sample app
- [toobusy](https://github.com/lloyd/node-toobusy) - monitors the process and serves 503 responses when it's too busy
- [update-notifier](https://github.com/yeoman/update-notifier) - used to tell you when there's a new version of Roosevelt

License
===

All original code in Roosevelt is licensed under the [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/). Commercial and noncommercial use is permitted with attribution.