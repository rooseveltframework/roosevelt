roosevelt.js
=

Roosevelt is a web framework for <a href='http://nodejs.org/'>Node.js</a> which uses <a href='https://github.com/kethinov/teddy'>teddy.js</a> for HTML templating.

Built on <a href='http://expressjs.com/'>Express</a>, Roosevelt abstracts most of Express' boilerplate, sets sane defaults with mechanisms for override, and provides a uniform <a href='http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller'>MVC</a> structure for your app.

Installation
=

Install command line tool globally (may require sudo):

```
npm install -g roosevelt
```
Make an app
=

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
node .
```

That's pretty much it.

What's in app.js?
=

Just this:

```js
var app = require('roosevelt')({
  /**
   * params:
   * 
   * param name:      default value
   * name:            'Roosevelt Express'
   * port:            43711
   * controllersPath: 'mvc/controllers/'
   * viewsPath:       'mvc/views/'
   * imagesPath:      'statics/i/'
   * cssPath:         'statics/css/'
   * jsPath:          'statics/js/'
   * customConfigs:   function() { put custom Express config code here }
   */
});
```

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All params are optional.

Params
=

Here's what the params mean:

- name: the name of your app
- port: the port your app will run on (default is 43711)
- controllersPath: path on filesystem to where your controller files are located (default is "mvc/controllers")
- viewsPath: path on filesystem to where your view files are located (default is "mvc/views")
- imagesPath: path on filesystem to where your image files are located (default is "statics/i")
- cssPath: path on filesystem to where your CSS files are located (default is "statics/css")
- jsPath: path on filesystem to where your JS files are located (default is "statics/js")
- customConfigs: use this to define a custom function to be executed during the Express config stage if you need one

How do I make new routes?
=

URL endpoints are defined by controller files.

The Roosevelt framework will automatically assign a route matching each controller's filename.

As such, to make a new route, just make a new file in the controllers directory.

For example, suppose we make a new file in `mvc/controllers` called `hello.js`:

```js
module.exports = function(req, res) {
  res.render('hello.html', require('../models/helloModel'));
};
```

That will make a new URL endpoint called "hello" on your app which will attempt to render a template in the `mvc/views` directory called `hello.html` and pass a model from the `mvc/models` directory called `helloModel.js`.

Missing features
=

Here are some things still left to be implemented:

- Support for templating engines other than teddy
- HTTPS support
- Support for more custom HTTP status code error pages
- Probably many other things

Dependencies
=

Node.js dependencies:

- <a href='http://nodejs.org/api/fs.html'>fs</a> (bundled with Node.js) - a default Node.js module which provides filesystem access
- <a href='http://nodejs.org/api/http.html'>http</a> (bundled with Node.js) - a default Node.js module which provides HTTP web server support
- <a href='http://expressjs.com/'>express</a> - a minimal and flexible node.js web application framework
- <a href='https://github.com/kethinov/teddy'>teddy</a> - an easy-to-read, HTML-based, mostly logic-less DOM templating engine
- <a href='https://github.com/ryanmcgrath/wrench-js'>wrench</a> - used by the CLI tool to help you create your sample app

License
=

All original code in Teddy is licensed under the <a href='http://creativecommons.org/licenses/by/3.0/deed.en_US'>Creative Commons Attribution 3.0 Unported License</a>. Commercial and noncommercial use is permitted with attribution.