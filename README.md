roosevelt.js
===

Roosevelt is a new web framework for <a href='http://nodejs.org/'>Node.js</a> which uses <a href='https://github.com/kethinov/teddy'>teddy.js</a> for HTML templating and <a href='http://lesscss.org/'>LESS</a> for CSS preprocessing.

Built on <a href='http://expressjs.com/'>Express.js</a>, Roosevelt is designed to abstract all the crusty boilerplate necessary to build a typical Express app, sets sane defaults with mechanisms for override, and provides a uniform <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> structure for your app based on <a href='http://nodejs.org/api/events.html'>EventEmitter</a>.

<img src='sampleApp/statics/i/teddy.jpg' alt=''/>

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular Node.js-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of <a href='http://expressjs.com/'>Express.js</a> is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> architecture driven by <a href='http://nodejs.org/api/events.html'>EventEmitter</a>.
- <a href='https://github.com/kethinov/teddy'>Teddy.js</a> HTML templates are much easier to read and maintain than popular alternatives.

Make a Roosevelt app
===

Install the command line tool globally:

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
npm install .
```

Run the app:

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
  - `i`: folder for image files
  - `js`: folder for JS files
  - `less`: folder for LESS files

Minimal boilerplate
===

All that's in app.js is this:

```js
global.app = require('roosevelt'), app({
  /**
   * params:
   *
   * param name:      default value
   *
   * name:            'Roosevelt Express',
   * port:            43711,
   * modelsPath:      'mvc/models',
   * viewsPath:       'mvc/views',
   * controllersPath: 'mvc/controllers',
   * staticsRoot:     'statics',
   * imagesPath:      'statics/i',
   * cssPath:         'statics/css',
   * lessPath:        'statics/less',
   * jsPath:          'statics/js',
   * staticsPrefix:   '', // useful to place a version number in here
   * customConfigs:   function() { put custom Express config code here }
   */
});
```

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional.

*Note: `app` must be defined as a global variable so that your models and controllers can access its utility methods later.*
  
Configure your app
===

Inside `app.js`, you can pass any of the following optional parameters to Roosevelt:

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
            <th><code>name</code></th>
            <td>The name of your app.</td>
            <td><code>Roosevelt Express</code></td>
        </tr>
        <tr>
            <th><code>port</code></th>
            <td>The port your app will run on.</td>
            <td><code>43711</code></td>
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
            <th><code>staticsRoot</code></th>
            <td>All files and folders specified in this path will be exposed as statics.</td>
            <td><code>statics</code></td>
        </tr>
        <tr>
            <th><code>imagesPath</code></th>
            <td>Path on filesystem to where your image files are located.</td>
            <td><code>statics/i</code></td>
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
            <th><code>jsPath</code></th>
            <td>Path on filesystem to where your JS files are located.</td>
            <td><code>statics/js</code></td>
        </tr>
        <tr>
            <th><code>staticsPrefix</code></th>
            <td>String to prefix statics with in the URL (useful for versioning statics).</td>
            <td><code>undefined</code></td>
        </tr>
        <tr>
            <th><code>customConfigs</code></th>
            <td>Use this to define a custom function to be executed during the Express config stage if you need one, e.g. <br/><code>function() { put custom Express config code here }</code>.</td>
            <td><code>undefined</code></td>
        </tr>
    </tbody>
</table>

Making controllers and models
===

URL endpoints (also called routes) are defined by controller files.

The Roosevelt framework will automatically assign a route matching each controller's filename.

As such, to make a new route, just make a new file in the controllers directory.

For example, suppose we make a new file in `mvc/controllers` called `hello.js`.

That will make a new URL endpoint `/hello` on your app.

Here's a sample `hello.js` controller:

```js
// loads "mvc/helloModel.js" and passes the req (request) and res (response) objects from Express
module.exports = app.loadModel('helloModel');

// listens for a "helloReady" event to be emitted by the "mvc/helloModel.js" model
app.on('helloReady', function(res, model) {

  // when the model emits the event, it will pass along the res (response) object from Express
  // along with the fully composed data model from "mvc/helloModel.js"
  res.render('hello', model);
});
```

The above controller file will make a new URL endpoint `/hello` on your app and load a model from the `mvc/models` directory called `helloModel.js`.

When the `helloModel.js` model is done gathering the data the view will need, it is expected that it will emit an event called `helloReady` which will be caught by your `hello.js` controller so that the `hello.html` view can be rendered with the fully composed model.

As such, your `helloModel.js` file should look something like this:

```js
// the passed vars req (request) and res (response) objects come from Express
var model = function(req, res) {

  // do whatever magic you need to do to define your data model here
  model.data = {some: 'data'};
  
  // now fire the event which will pass control back to the controller
  // pass along res (response) from Express and your new fully composed data model
  app.emit('helloReady', res, model.data);
};

// this line is necessary to make the model loadable by a controller
module.exports = model;
```

That's it. Just follow that pattern to do MVC in your app. 

LESS CSS support
===

Roosevelt will automatically compile any <a href='http://lesscss.org/'>LESS</a> (`.less`) files in your LESS folder down to minified CSS (`.css`) files of the same name in your CSS folder.

In the process it will overwrite any preexisting CSS files of the same name, so be careful.

The CSS minifier used by LESS is <a href='http://yui.github.io/yuicompressor/css.html'>YUI Compressor</a>.

Fair warning: Roosevelt is beta software
===

Not many apps have been written using Roosevelt yet, so it's entirely possible that there will be some significant bugs.

Helped wanted!
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

- <a href='http://expressjs.com/'>express</a> - a minimal and flexible node.js web application framework
- <a href='https://github.com/kethinov/teddy'>teddy</a> - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- <a href='https://github.com/emberfeather/less.js-middleware'>less-middleware</a> - Connect middleware for LESS compiling
- <a href='https://github.com/ryanmcgrath/wrench-js'>wrench</a> - used by the CLI tool to help you create your sample app

License
===

All original code in Roosevelt is licensed under the <a href='http://creativecommons.org/licenses/by/3.0/deed.en_US'>Creative Commons Attribution 3.0 Unported License</a>. Commercial and noncommercial use is permitted with attribution.