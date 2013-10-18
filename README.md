roosevelt.js
===

Roosevelt is a new web framework for <a href='http://nodejs.org/'>Node.js</a> which uses <a href='https://github.com/kethinov/teddy'>Teddy</a> for HTML templating and <a href='http://lesscss.org/'>LESS</a> for CSS preprocessing.

Built on <a href='http://expressjs.com/'>Express</a>, Roosevelt is designed to abstract all the crusty boilerplate necessary to build a typical Express app, sets sane defaults with mechanisms for override, and provides a uniform <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> structure for your app based on <a href='http://nodejs.org/api/events.html'>EventEmitter</a>.

<img src='sampleApp/statics/i/teddy.jpg' alt=''/>

Why use Roosevelt?
===

Roosevelt is easy to use and has a low learning curve, unlike many other popular Node.js-based web frameworks.

Reasons for this include:

- Minimal boilerplate to get started. All the magic of <a href='http://expressjs.com/'>Express</a> is preconfigured for you.
- Default directory structure is simple, but easily configured.
- Concise <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> architecture driven by <a href='http://nodejs.org/api/events.html'>EventEmitter</a>.
- <a href='https://github.com/kethinov/teddy'>Teddy</a> HTML templates are much easier to read and maintain than popular alternatives.

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
global.app = require('roosevelt');
app({
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

Defining routes (URL endpoints)
===

A route is the term Express uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`.

The Roosevelt framework will automatically assign a route corresponding to the name of each file in your controllers directory. As such, to make a new route just make a new file in the controllers directory.

Making controller files
===

Suppose we make a controller file called `hello.js`. Because the controller's file name is `hello.js`, Roosevelt will make a new URL endpoint `http://yoursite/hello` on your app.

Here's some sample code for your controller:

```js
module.exports = app.loadModel('helloModel');

app.on('helloReady', function(res, model) {
  res.render('hello', model);
});
```

Here's a line-by-line explanation of how it works:

The first line `module.exports = app.loadModel('helloModel');` explained:

- This line loads the `helloModel` data model.
- `app.loadModel` is Roosevelt's method for loading a model from your models directory.
- `helloModel` is the name of the model file we're loading in this example code.
- Assigning `app.loadModel('helloModel')` to `module.exports` allows Roosevelt to load and execute the code in your model file each time someone visits `http://yoursite/hello`.

The next line `app.on('helloReady', function(res, model) {` explained:

- This line listens for an event called `helloReady` which will be called later when you create your model.
- `app.on` is an <a href='http://nodejs.org/api/events.html#events_emitter_on_event_listener'>EventEmitter</a> method which accepts two arguments: `eventName` and `listener`.
- `helloReady` is the `eventName` we will listen for.
- `function(res, model) {` is the beginning of the `listener` function that will be executed when the `helloReady` event is fired.
- `res` is the <a href='http://expressjs.com/api.html#res'>response object</a> provided by Express.
- `model` is the data model provided by `helloModel`.

The last line `res.render('hello', model);` explained:

- This line renders a template called `hello.html` when the `helloReady` event is fired.
- `res.render` is the <a href='http://expressjs.com/api.html#app.render'>template rendering method provided by Express</a>. If no file extension is provided to the template name, Roosevelt will assume the extension is `.html`.
- `hello` is the name of the template file (sans file extension) to render.

Making model files
===

Now that we've defined our `hello.js` controller above, we need to make the `helloModel` model file it references.

Here's a sample `helloModel.js`:

```js
var model = function(req, res) {
  model.data = {some: 'data'};
  app.emit('helloReady', res, model.data);
};

module.exports = model;
```

Here's a line-by-line explanation of how it works:

The first line `var model = function(req, res) {` explained:

- This line defines your model as a standard <a href='http://expressjs.com/api.html#app.VERB'>Express route callback</a>.
- `req` is a standard Express <a href='http://expressjs.com/api.html#req.params'>Express request object</a>.
- `res` is a standard Express <a href='http://expressjs.com/api.html#res.status'>Express response object</a>.

The next line `model.data = {some: 'data'};` is just a sample model definition. In place of this in a real app you would probably have several lines of much more complex code defining `model.data` by pulling data out of a database or from wherever your app's data is stored. How you deal with your app's data is up to you, but the code for it generally speaking should live in your model files.

The next line `app.emit('helloReady', res, model.data);` explained:

- With the data model fully composed, this line emits the `helloReady event`, which the controller is listening for.
- `app.emit` is an <a href='http://nodejs.org/api/events.html#events_emitter_emit_event_arg1_arg2'>EventEmitter</a> method which lets you emit arbitrary events at will.
- `helloReady` is the name of the event to emit.
- `res` is the <a href='http://expressjs.com/api.html#res'>response object</a> provided by Express.
- `model.data` is the data model to pass to the controller. *Note: This must be an object, not a function.*

The last line `module.exports = model;` makes the model loadable by a controller.


Making view files
===

Views are <a href='https://github.com/kethinov/teddy'>Teddy</a> templates. See the Teddy documentation for information about how to author Teddy templates.

Using LESS with Roosevelt
===

Using <a href='http://lesscss.org/'>LESS</a> with Roosevelt is optional.

Roosevelt will automatically compile any (`.less`) files in your LESS folder down to minified CSS (`.css`) files of the same name in your CSS folder. *Note: This will overwrite any preexisting CSS files of the same name, so be careful.*

The CSS minifier used by LESS is <a href='http://yui.github.io/yuicompressor/css.html'>YUI Compressor</a>.

Objects exposed by Roosevelt
===

After you `require('roosevelt')`, assign it to something like `global.app`, and then call `app()`, you might want to know what objects `app()` exposes.

Here's a handy chart:

<table>
    <thead>
        <tr>
            <th>Object</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><code>app</code></th>
            <td>Your Roosevelt app. At a basic level, a Roosevelt app is just an <a href='http://expressjs.com/api.html#express'>Express app</a> with some settings changed and with the new member objects and methods outlined below.</td>
        </tr>
        <tr>
            <th><code>app.params</code></th>
            <td>The list of parameters you passed to Roosevelt.</td>
        </tr>
        <tr>
            <th><code>app.express</code></th>
            <td>The <a href='http://expressjs.com/api.html#express'>Express object</a> created by Roosevelt.</td>
        </tr>
        <tr>
            <th><code>app.teddy</code></th>
            <td>The <a href='https://github.com/kethinov/teddy'>Teddy object</a> created by Roosevelt.</td>
        </tr>
        <tr>
            <th><code>app.loadModel</code></th>
            <td>Calling <code>app.loadModel('modelName')</code> will load a specified model from your models folder.</td>
        </tr>
        <tr>
        	<th colspan='2'>Paths exposed</th>
        <tr>
            <th><code>app.appdir</code></th>
            <td>Full path on the filesystem that the main module is located in.</td>
        </tr>
        <tr>
            <th><code>app.modelsPath</code></th>
            <td>Full path on the filesystem that the models directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.viewsPath</code></th>
            <td>Full path on the filesystem that the views directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.controllersPath</code></th>
            <td>Full path on the filesystem that the controllers directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.staticsRoot</code></th>
            <td>Full path on the filesystem that the statics root directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.imagesPath</code></th>
            <td>Full path on the filesystem that the images directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.cssPath</code></th>
            <td>Full path on the filesystem that the CSS file directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.lessPath</code></th>
            <td>Full path on the filesystem that the LESS file directory is located in.</td>
        </tr>
        <tr>
            <th><code>app.jsPath</code></th>
            <td>Full path on the filesystem that the client-side JS file directory is located in.</td>
        </tr>
        <tr>
        	<th colspan='2'>Event objects and methods</th>
        <tr>
        <tr>
            <th><code>app.events</code></th>
            <td>The <a href='http://nodejs.org/api/events.html'>Events</a> object created by Roosevelt.</td>
        </tr>
        <tr>
            <th><code>app.emitter</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object created by Roosevelt.</td>
        </tr>
        <tr>
            <th><code>app.addListener</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_addlistener_event_listener'>addListener</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.on</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_on_event_listener'>on</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.once</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_once_event_listener'>once</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.removeListener</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_removelistener_event_listener'>removeListener</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.removeAllListeners</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_removealllisteners_event'>removeAllListeners</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.setMaxListeners</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n'>setMaxListeners</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.listeners</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_listeners_event'>listeners</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
        </tr>
        <tr>
            <th><code>app.emit</code></th>
            <td>The <a href='http://nodejs.org/api/events.html#events_emitter_emit_event_arg1_arg2'>emit</a> method bound to Roosevelt's <a href='http://nodejs.org/api/events.html#events_class_events_eventemitter'>EventEmitter</a> object.</td>
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

- <a href='http://expressjs.com/'>express</a> - a minimal and flexible node.js web application framework
- <a href='https://github.com/kethinov/teddy'>teddy</a> - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- <a href='https://github.com/emberfeather/less.js-middleware'>less-middleware</a> - Connect middleware for LESS compiling
- <a href='https://github.com/ryanmcgrath/wrench-js'>wrench</a> - used by the CLI tool to help you create your sample app

License
===

All original code in Roosevelt is licensed under the <a href='http://creativecommons.org/licenses/by/3.0/deed.en_US'>Creative Commons Attribution 3.0 Unported License</a>. Commercial and noncommercial use is permitted with attribution.