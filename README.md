roosevelt.js
===

Roosevelt is a web framework for <a href='http://nodejs.org/'>Node.js</a> which uses <a href='https://github.com/kethinov/teddy'>teddy.js</a> for HTML templating.

Built on <a href='http://expressjs.com/'>Express</a>, Roosevelt is designed to abstract all the crusty boilerplate necessary to build a typical Express app, sets sane defaults with mechanisms for override, and provides a uniform <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> structure for your app based on the Node.js <a href='http://nodejs.org/api/events.html'>EventEmitter</a>.

Installation
===

Install command line tool globally (may require sudo):

```
npm install -g roosevelt
```
Make an app
===

Use the command line tool to create a sample app:

```
roosevelt create myapp
```

Change into your new app's directory and then install dependencies (may require sudo):

```
cd myapp
npm install .
```

Run the app:

```
node app.js
```

That's pretty much it.

What's in app.js?
===

Just this:

```js
GLOBAL.app = require('roosevelt');
app({
  /**
   * params:
   * 
   * param name:      default value
   * name:            'Roosevelt Express'
   * port:            43711
   * modelsPath:      'mvc/models/'
   * viewsPath:       'mvc/views/'
   * controllersPath: 'mvc/controllers/'
   * imagesPath:      'statics/i/'
   * cssPath:         'statics/css/'
   * lessPath:        'statics/less/'
   * jsPath:          'statics/js/'
   * statics:         { something: 'statics/something', something_else: 'statics/something_else' }
   * customConfigs:   function() { put custom Express config code here }
   */
});
```

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional.

Note: app must be defined as a global variable so that your models and controllers can access its utility methods later.

Parameters
===

Here's what the parameters mean:

- `name`: the name of your app
- `port`: the port your app will run on (default is 43711)
- `modelsPath`: path on filesystem to where your model files are located (default is "mvc/models")
- `viewsPath`: path on filesystem to where your view files are located (default is "mvc/views")
- `controllersPath`: path on filesystem to where your controller files are located (default is "mvc/controllers")
- `imagesPath`: path on filesystem to where your image files are located (default is "statics/i")
- `cssPath`: path on filesystem to where your CSS files are located (default is "statics/css")
- `lessPath`: path on filesystem to where your LESS files are located (default is "statics/less")
- `jsPath`: path on filesystem to where your JS files are located (default is "statics/js")
- `statics`: list of paths on filesystem to where your statics are located (setting this param overrides and supersedes imagesPath, cssPath, lessPath, and jsPath)
- `customConfigs`: use this to define a custom function to be executed during the Express config stage if you need one

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
  res.render('hello.html', model);
});
```

The above controller file will make a new URL endpoint `/hello` on your app and load a model from the `mvc/models` directory called `helloModel.js`.

When the `helloModel.js` is done gathering the data the view will need, it is expected that it will emit an event called `helloReady` which will be caught by your `hello.js` controller so that the `hello.html` view can be rendered with the fully composed model.

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

When a Roosevelt server is started, it will automatically compile any <a href='http://lesscss.org/'>LESS</a> (`.less`) files in your LESS folder down to minified CSS (`.css`) files of the same name in your CSS folder.

In the process it will overwrite any preexisting CSS files of the same name, so be careful.

Missing features
===

Here are some things still left to be implemented:

- Support for templating engines other than teddy
- HTTPS support
- Support for more custom HTTP status code error pages
- Probably many other things

Dependencies
===

- <a href='http://nodejs.org/api/events.html'>events</a> (bundled with Node.js) - a default Node.js module which provides an event emitter
- <a href='http://nodejs.org/api/fs.html'>fs</a> (bundled with Node.js) - a default Node.js module which provides filesystem access
- <a href='http://nodejs.org/api/http.html'>http</a> (bundled with Node.js) - a default Node.js module which provides HTTP web server support
- <a href='http://expressjs.com/'>express</a> - a minimal and flexible node.js web application framework
- <a href='https://github.com/kethinov/teddy'>teddy</a> - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- <a href='http://lesscss.org/'>LESS</a> - dynamic CSS language extensions
- <a href='https://github.com/ryanmcgrath/wrench-js'>wrench</a> - used by the CLI tool to help you create your sample app

License
===

All original code in Roosevelt is licensed under the <a href='http://creativecommons.org/licenses/by/3.0/deed.en_US'>Creative Commons Attribution 3.0 Unported License</a>. Commercial and noncommercial use is permitted with attribution.