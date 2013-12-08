roosevelt.js [![NPM version](https://badge.fury.io/js/roosevelt.png)](http://badge.fury.io/js/roosevelt)
===

Roosevelt is a new web framework for <a href='http://nodejs.org/'>Node.js</a> which uses <a href='https://github.com/kethinov/teddy'>Teddy</a> for HTML templating and <a href='http://lesscss.org/'>LESS</a> for CSS preprocessing.

Built on <a href='http://expressjs.com/'>Express</a>, Roosevelt is designed to abstract all the crusty boilerplate necessary to build a typical Express app, sets sane defaults with mechanisms for override, and provides a uniform <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> structure for your app.

<img src='sampleApp/statics/images/teddy.jpg' alt=''/>

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular Node.js-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of <a href='http://expressjs.com/'>Express</a> is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> architecture.
- <a href='https://github.com/kethinov/teddy'>Teddy</a> HTML templates are much easier to read and maintain than popular alternatives.
- Built-in support for load balancing using the Node.js <a href='http://nodejs.org/api/cluster.html'>cluster</a> module.

Make a Roosevelt app
===

Install the command line tool globally (may require sudo):

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

Run your app on two CPUs:

```
node app.js -cores 2
```

Run your app on all your CPUs:

```
node app.js -cores max
```

While developing your app, a better way to run the app is to use the developer mode.

When your app is running in developer mode, it will automatically restart whenever you modify any JS, JSON, LESS, or HTML files.

To run your app in developer mode, first `npm install -g nodemon` (may require sudo), and then simply execute this command:

```
npm start
```

Default directory structure
===

- `app.js`: main app file
- `mvc`: folder for models, views, and controllers
  - `controllers`: folder for controller files
  - `models`: folder for model files
  - `views`: folder for view files
- `statics`: folder for CSS, images, JS files, LESS files, and other statics
  - `css`: folder for CSS files
  - `images`: folder for image files
  - `js`: folder for JS files
  - `less`: folder for LESS files

Minimal boilerplate
===

All that's in app.js is this:

```js
require('roosevelt')({
/*
  param name:               default value

  name:                     'Roosevelt Express',
  port:                     43711,
  modelsPath:               'mvc/models',
  viewsPath:                'mvc/views',
  controllersPath:          'mvc/controllers',
  notFoundPage:             '404.js',
  staticsRoot:              'statics',
  cssPath:                  'statics/css',
  lessPath:                 'statics/less',
  prefixStaticsWithVersion: false, // changes static urls like /css/file.css to /{versionNumber}/css/file.css
  versionNumberLessVar:     '', // populate statics/less/version.less with a LESS variable of this name
  formidableSettings:       {}, // settings to pass to formidable: https://github.com/felixge/node-formidable#api

  events:                   sample function

  onServerStart:            function(app) {
                              // code which executes when the server starts
                            },
  onReqStart:               function(req, res, next) {
                              // code which executes at the beginning of each request
                              // must call next() when your code finishes
                            },
  onReqBeforeRoute:         function(req, res, next) {
                              // code which executes just before the controller is executed
                              // must call next() when your code finishes
                            },
  onReqAfterRoute:          function(req, res) {
                              // code which executes after the request finishes
                            }
*/
});
```

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional.
  
Configure your app
===

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

Inside `app.js`, you can pass any of the below optional parameters to Roosevelt. Each can also be defined in `package.json` under `"rooseveltConfig"`.

<table>
    <thead>
        <tr>
            <th>Option</th>
            <th>Description</th>
            <th>Default</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><code>port</code></th>
            <td>The port your app will run on.</td>
            <td>Either <code>process.env.NODE_PORT</code> or if that's undefined, then <code>43711</code></td>
        </tr>
        <tr>
            <th><code>modelsPath</code></th>
            <td>Path on filesystem to where your model files are located.</td>
            <td><code>mvc/models</code></td>
        </tr>
        <tr>
            <th><code>viewsPath</code></th>
            <td>Path on filesystem to where your view files are located.</td>
            <td><code>mvc/views</code></td>
        </tr>
        <tr>
            <th><code>controllersPath</code></th>
            <td>Path on filesystem to where your controller files are located.</td>
            <td><code>mvc/controllers</code></td>
        </tr>
        <tr>
            <th><code>notFoundPage</code></th>
            <td>Relative path on filesystem to where your "404 Not Found" controller is located. If you do not supply one, Roosevelt will use its default 404 controller instead.</td>
            <td><code>404.js</code></td>
        </tr>
        <tr>
            <th><code>internalServerErrorPage</code></th>
            <td>Relative path on filesystem to where your "500 Internal Server Error" controller is located. If you do not supply one, Roosevelt will use its default 500 controller instead.</td>
            <td><code>500.js</code></td>
        </tr>
        <tr>
            <th><code>serviceUnavailablePage</code></th>
            <td>Relative path on filesystem to where your "503 Service Unavailable" controller is located. If you do not supply one, Roosevelt will use its default 503 controller instead.</td>
            <td><code>503.js</code></td>
        </tr>
        <tr>
            <th><code>staticsRoot</code></th>
            <td>Path on filesystem to where your static assets are located. All files and folders specified in this path will be exposed as statics.</td>
            <td><code>statics</code></td>
        </tr>
        <tr>
            <th><code>cssPath</code></th>
            <td>Path on filesystem to where your CSS files are located.</td>
            <td><code>statics/css</code></td>
        </tr>
        <tr>
            <th><code>lessPath</code></th>
            <td>Path on filesystem to where your LESS files are located.</td>
            <td><code>statics/less</code></td>
        </tr>
        <tr>
            <th><code>prefixStaticsWithVersion</code></th>
            <td>If set to true, Roosevelt will prepend your app's version number from <code>package.json</code> to your statics URLs. Versioning your statics is useful for resetting your users' browser cache when you release a new version.</td>
            <td><code>false</code></td>
        </tr>
        <tr>
            <th><code>versionNumberLessVar</code></th>
            <td>When this option is activated, Roosevelt will write a file named <code>version.less</code> to your <code>less</code> directory containing a variable with your desired name populated with your app's version number derived from <code>package.json</code>.<br/><br/>This option is disabled by default. Activate it by supplying a desired variable name to the parameter.<br/><br/>This feature is useful in conjunction with <code>prefixStaticsWithVersion</code>, as it allows you to construct URLs in your LESS files such as <code>url('/@{staticsVersion}/images/i.png')</code>, allowing you to version all of your statics at once simply by changing your app's version number in <code>package.json</code>.</td>
            <td><code>undefined</code></td>
        </tr>
        <tr>
            <th><code>formidableSettings</code></th>
            <td>Settings to pass along to <a href='https://github.com/felixge/node-formidable'>formidable</a> using <a href='https://github.com/felixge/node-formidable#api'>formidable's API</a>.</td>
            <td><code>undefined</code></td>
        </tr>
        <tr>
            <th><code>shutdownTimeout</code></th>
            <td>Maximum amount of time given to Roosevelt to gracefully shut itself down when sent the kill signal.</td>
            <td><code>30000</code> (30 seconds)</td>
        </tr>
    </tbody>
</table>

Roosevelt also provides a series of events you can attach code to by passing a function to the desired event as a parameter.

<table>
	<thead>
        <tr>
            <th>Event</th>
            <th>Description</th>
            <th>Arguments passed</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><code>onServerStart</code></th>
            <td>Fired when the server starts.</td>
            <td>
            	<ul>
            		<li><code>app</code>: the <a href='http://expressjs.com/api.html#express'>Express app</a> created by Roosevelt.</li>
            	</ul>
            </td>
        </tr>
        <tr>
            <th><code>onReqStart</code></th>
            <td>Fired at the beginning of each new request.</td>
            <td>
            	<ul>
            		<li><code>req</code>: the <a href='http://expressjs.com/api.html#req.params'>request object</a> created by Express.</li>
            		<li><code>res</code>: the <a href='http://expressjs.com/api.html#res.status'>response object</a>  created by Express.</li>
            		<li><code>next</code>: callback to continue with the request. Must be called to continue the request.</li>
            	</ul>
            </td>
        </tr>
        <tr>
            <th><code>onReqBeforeRoute</code></th>
            <td>Fired just before executing the controller.</td>
            <td>
            	<ul>
            		<li><code>req</code>: the <a href='http://expressjs.com/api.html#req.params'>request object</a> created by Express.</li>
            		<li><code>res</code>: the <a href='http://expressjs.com/api.html#res.status'>response object</a>  created by Express.</li>
            		<li><code>next</code>: callback to continue with the request. Must be called to continue the request.</li>
            	</ul>
            </td>
        </tr>
        <tr>
            <th><code>onReqAfterRoute</code></th>
            <td>Fired after the request ends.</td>
            <td>
            	<ul>
            		<li><code>req</code>: the <a href='http://expressjs.com/api.html#req.params'>request object</a> created by Express.</li>
            		<li><code>res</code>: the <a href='http://expressjs.com/api.html#res.status'>response object</a> created by Express.</li>
            	</ul>
            </td>
        </tr>
    </tbody>
</table>

Defining routes (URL endpoints)
===

A route is the term <a href='http://expressjs.com'>Express</a> uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`. To make a new route, just make a new file in the controllers directory.

Making controller files
===

Controller files are just <a href='http://expressjs.com/api.html#app.VERB'>standard Express routes</a>. For example: 

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

Views are <a href='https://github.com/kethinov/teddy'>Teddy</a> templates. See the Teddy documentation for information about how to author Teddy templates.

Using LESS with Roosevelt
===

Using <a href='http://lesscss.org/'>LESS</a> with Roosevelt is optional.

Roosevelt will automatically compile any (`.less`) files in your LESS folder down to minified CSS (`.css`) files of the same name in your CSS folder. *Note: This will overwrite any preexisting CSS files of the same name, so be careful.*

The CSS minifier used by LESS is <a href='http://yui.github.io/yuicompressor/css.html'>YUI Compressor</a>.

Express variables exposed by Roosevelt
===

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.

<table>
    <thead>
        <tr>
            <th>Express variable</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><code>express</code></th>
            <td>The <a href='http://expressjs.com'>express</a> Node.js module.</td>
        </tr>
        <tr>
            <th><code>teddy</code></th>
            <td>The <a href='https://github.com/kethinov/teddy'>teddy</a> Node.js module.</td>
        </tr>
        <tr>
            <th><code>formidable</code></th>
            <td>The <a href='https://github.com/felixge/node-formidable'>formidable</a>  Node.js module.</td>
        </tr>
        <tr>
            <th><code>appName</code></th>
            <td>The name of your app derived from <code>package.json</code>. Uses "Roosevelt Express" if no name is supplied.</td>
        </tr>
        <tr>
            <th><code>appDir</code></th>
            <td>The directory the main module is in.</td>
        </tr>
        <tr>
            <th><code>package</code></th>
            <td>The contents of <code>package.json</code></td>
        </tr>
        <tr>
            <th><code>staticsRoot</code></th>
            <td>Full path on the file system to where your app's statics folder is located.</td>
        </tr>
        <tr>
            <th><code>modelsPath</code></th>
            <td>Full path on the file system to where your app's models folder is located.</td>
        </tr>
        <tr>
            <th><code>viewsPath</code></th>
            <td>Full path on the file system to where your app's views folder is located.</td>
        </tr>
        <tr>
            <th><code>controllersPath</code></th>
            <td>Full path on the file system to where your app's controllers folder is located.</td>
        </tr>
        <tr>
            <th><code>params</code></th>
            <td>The params you sent to Roosevelt.</td>
        </tr>
        <tr>
            <th><code>port</code></th>
            <td>Port Roosevelt is running on.</td>
        </tr>
        <tr>
            <th><code>model</code></th>
            <td>Method to return a model. Calling <code>app.get('model')('modelName')</code> will return a specified model from your models folder.</td>
        </tr>
    </tbody>
</table>


Warning: Roosevelt is beta software!
===

Not many apps have been written using Roosevelt yet, so it's entirely possible that there will be some significant bugs.

You should not use Roosevelt in production yet unless you're willing to devote some time to fixing any bugs you might find.

Help wanted!
===

Pull requests are welcome! Here are some things at the top of the to-do list at the moment:

- HTTPS support
- Support for more custom HTTP status code error pages
- Support for templating engines other than teddy
- Support for CSS preprocessors other than LESS
- Support for a client-side JS minifier (e.g. Google's Closure compiler)
- Probably many other things are needed too

Dependencies
===

- <a href='http://expressjs.com/'>express</a> - a minimal and flexible Node.js web application framework
- <a href='https://github.com/kethinov/teddy'>teddy</a> - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- <a href='https://github.com/emberfeather/less.js-middleware'>less-middleware</a> - Connect middleware for LESS compiling
- <a href='https://github.com/felixge/node-formidable'>formidable</a> - a Node.js module for parsing form data, especially file uploads
- <a href='https://github.com/ryanmcgrath/wrench-js'>wrench</a> - used by the CLI tool to help you create your sample app

License
===

All original code in Roosevelt is licensed under the <a href='http://creativecommons.org/licenses/by/4.0/'>Creative Commons Attribution 4.0 International License</a>. Commercial and noncommercial use is permitted with attribution.