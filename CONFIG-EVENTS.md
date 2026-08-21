# Events and Express variables

## Events

Roosevelt provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
(async () => {
  await require('roosevelt')({
    onServerStart: (app) => { /* do something */ }
  }).startServer()
})()
```

### Event list

These are sorted in order of when they are executed during the lifecycle of a Roosevelt app.

- `onBeforeMiddleware(app)`: Fired when the app begins initializing, prior to any middleware being loaded into the app.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

- `onBeforeControllers(app)`: Fired during initialization, prior to any routes being loaded.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

- `onBeforeStatics(app)`: Fired during initialization, prior to any statics being written.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

- `onClientViewsProcess(template)`: Fired to preprocess templates before being exposed to the client.
  - `template`: A string containing a template written in any JS-based templating engine (e.g. Teddy, Pug, ejs, etc).

- `onServerInit(app)`: Fired when the server is fully initialized and all middleware has been loaded but before the server has started.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

- `onServerStart(app)`: Fired when the server starts.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

- `onAppExit(app)`: Fired when the app recieves a kill signal.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.

## Express variables exposed by Roosevelt

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.

- `appDir`: The directory the main module is in.
- `appName`: The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied.
- `appVersion`: The version number of your app derived from `package.json`.
- `controllersPath`: Full path on the file system to where your app's controllers folder is located.
- `clientControllersBundledOutput`: Full path on the file system to where your app's client-exposed controllers folder is located.
- `clientViewsBundledOutput`: Full path on the file system to where your app's client-exposed views folder is located.
- `cssCompiledOutput`: Full path on the file system to where your app's minified CSS files are located.
- `cssPath`: Full path on the file system to where your app's CSS source files are located.
- `debugMarkup`: HTML you can add to your custom error pages if you define any that will print server errors if any exist, display the route list, and add some inline JavaScript that will serialize the request's `err`, `req`, and `res` objects so you can interactively examine them in the browser's developer tools. Only available in development mode.
- `env`: Either `development` or `production`.
- `express`: The Express module.
- `expressSession`: The [express-session](https://github.com/expressjs/session) module Roosevelt uses internally. Session middleware.
- `expressSessionStore`: The session store instance used by [express-session](https://github.com/expressjs/session) module Roosevelt uses internally.
- `htmlPath`: Full path on the file system to where your app's HTML static page source files are located.
- `htmlRenderedOutput`: Full path on the file system to where your app's rendered and minified static HTML files are located.
- `httpServer`: The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt.
- `httpsServer`: The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt.
- `jsPath`: Full path on the file system to where your app's JS source files are located.
- `logger`: The [roosevelt-logger](https://rooseveltframework.org/docs/roosevelt-logger) module Roosevelt uses internally. Used for console logging.
- `modelsPath`: Full path on the file system to where your app's models folder is located.
- `package`: The contents of `package.json`.
- `params`: The parameters you sent to Roosevelt.
- `preprocessedStaticsPath` or `preprocessedStatics`: Full path on the file system to where your app's preprocessed statics folder is located.
- `preprocessedViewsPath` or `preprocessedViews`: Full path on the file system to where your app's preprocessed views folder is located.
- `publicFolder`: Full path on the file system to where your app's public folder is located.
- `roosevelt:state`: Application state, e.g. `disconnecting` if the app is currently being shut down.
- `router`: Instance of router module used by Roosevelt.
- `routePrefix`: Prefix appended to routes via the `routePrefix` param. Will be `''` if not set.
- `routes`: List of all routes in the app.
- `staticsRoot`: Full path on the file system to where your app's statics folder is located.
- `view engine`: Default view engine file extension, e.g. `.html`.
- *viewEngine* e.g. `teddy` by default: Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module.
- `viewsPath` or `views`: Full path on the file system to where your app's views folder is located.

Additionally the Roosevelt constructor returns the following object:

- `expressApp` *[Object]*: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `initServer(callback)` or `init(callback)` *[async Function]*: Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. Takes an optional callback.
- `startServer()` or `start()` *[async Function]*: Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config.
- `stopServer(params)` or `stop(params)` *[Function]*: Stops the server from accepting new connections before exiting and takes an optional argument `stopServer({ persistProcess: true })` which will allow the process to remain active after the server has closed.
