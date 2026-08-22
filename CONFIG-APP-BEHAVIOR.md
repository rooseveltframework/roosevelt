# App behavior options


- `bodyParser` *[Object]*: Parameters to supply to the [body-parser](https://github.com/expressjs/body-parser) module which handles POST requests.
  - `urlEncoded` *[Object]*: Parameters to supply to [body-parser.urlencoded](https://github.com/expressjs/body-parser#bodyparserurlencodedoptions).
  - `json` *[Object]*: Parameters to supply to [body-parser.json](https://github.com/expressjs/body-parser#bodyparserjsonoptions).

Default: *[Object]*

```javascript
{
  urlEncoded: {
    extended: true
  },
  json: {}
}
```

- `csrfProtection` *[Boolean or Object]*: Whether to enable [Cross-Site Request Forgery](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protection. Roosevelt asks the browser where each request came from and refuses any request that changes data unless the browser says it came from your own site, which browsers [report themselves](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site) and page scripts cannot forge. Default: `true`.
  - To disable the feature entirely, set it to false. To configure it, supply an object.
  - In the object:
    - `blockCrossSiteRequests` *[Boolean]*: Whether to ask the browser where each request came from and refuse any request that changes data unless the browser says it came from your own site. Default: `true`.
      - Requests that arrive without the browser saying where they came from are also refused. Anything that is not a browser, such as a mobile app or another server, does not send that information, so add those routes to `exemptions`.
      - This cannot stop an untrusted request coming from another subdomain of your own site, because browsers report those the same way they report your own pages. Use CSRF tokens via `requireTokens` to add protection against untrusted subdomains.
      - Setting this param to `false` leaves your app protected only by whatever `requireTokens` is set to.
    - `requireTokens` *[Boolean or String]*: Whether requests that change data must carry a CSRF token. Default: `false`.
      - `false`: no token is needed, which is fine for most apps. Note that `req.csrfToken()` is not available when set to `false`, since there are no tokens to generate.
      - `true`: always require a token. Set to `true` if anything untrusted is hosted on a subdomain you share, such as user uploaded content or a separate app someone else runs. That is the only way to stop an untrusted request coming from another subdomain of your own site, because browsers report those the same way they report your own pages. See the [coding apps](https://rooseveltframework.org/docs/latest/coding-apps/#examplepostroutewithcsrftokens) section for examples.
      - `"whenHeaderMissing"`: require a token only from browsers too old to report where a request came from, since they are otherwise refused. This does not stop an untrusted request coming from another subdomain of your own site either, because browsers that do report where a request came from are trusted without a token.
    - `trustedOrigins` *[Array of Strings]*: Other sites you expect requests from, such as a payment provider posting back to your app. Default: `[]`.
      - Example: `["https://accounts.someplace.somedomain"]`. Matched against the request's `Origin` header.
      - This only helps callers that send an `Origin` header, which means browsers. Use `exemptions` for anything else.
    - `exemptions` *[Array of Strings]*: Routes to skip all of these checks on. Supports wildcard matching. Use this for routes called by anything that is not a browser, such as a mobile app or another server.

Example of exemptions list: *[Object]*

```javascript
{
  exemptions: [
    '/foo',
    '/bar',
    '/baz'
  ]
}
```

- `expressSession` *[Boolean or Object]*: Parameters to pass to the [express-session](https://github.com/expressjs/session) module. Default: `true`.

Default if `expressSession` is set to `true`: *[Object]*

```javascript
{
  secret, // an auto-generated secret, read from your secrets folder
  resave: false, // usually a bad idea to set to true
  saveUninitialized: false, // usually a bad idea to set to true
  cookie: {
    secure: 'auto', // marks the cookie HTTPS only on any request that reached your app over HTTPS, whether the app served it or a web server in front did
    sameSite: 'strict', // adds same site enforcement
    maxAge: 347126472000 // sets expiration very far in the future (~11 years) to basically never expire
  },
  store // the expressSessionStore.instance Roosevelt param
}
```

If you supply your own config, note what `cookie.sameSite` does before leaving it out: Setting it to `"strict"` tells the browser not to send the session cookie along with any request that came from another site. A forged request from another site therefore arrives with nobody logged in, which is one of the protections that stops another site from making requests as your logged in users. Roosevelt warns at startup if your config leaves it unset, since a hand written config can drop it without meaning to.

It does not stop a request coming from another subdomain of your own site, because browsers count those as the same site. Only setting `csrfProtection.requireTokens` to `true` does that.

One side effect of `"strict"` is that a user following a link to your app from somewhere else, such as an email or a chat message, arrives without their session on that first page load and appears logged out. Reloading the page or clicking any link within your app restores it, since those requests come from your own site.

If that matters for your app, set `cookie.sameSite` to `"lax"` instead. The browser will then send the session cookie when a user navigates to your app from elsewhere, while still withholding it from a form or script on another site that tries to change data.

Whichever you choose, `csrfProtection.blockCrossSiteRequests` still refuses requests that change data unless the browser says they came from your own site, so relaxing this setting does not give up your CSRF protection.

- `expressSessionStore` *[Object]*: Define a custom session store to use with `express-session` instead of the default one provided by Roosevelt. Roosevelt's default store keeps sessions in a file on the server running the app, so you need this if you run your app on more than one server. See [scaling across several servers](./DEPLOYMENT.md#scale-across-several-servers).
  - `filename` *[String]*: Name of the session file.
  - `instance`: *[Object]* A store instance. See [this list](https://expressjs.com/en/resources/middleware/session.html#compatible-session-stores) for compatible stores.
  - `preset` *[String]*: Available presets provided by Roosevelt. Only used if `instance` is not provided.
    - Available options:
      - `"default"`: Use Roosevelt's default session store, which is [better-sqlite3-session-store](https://github.com/attestate/better-sqlite3-session-store), which we hard forked into Roosevelt to continue its regular maintenance since it is no longer maintained.
      - `"express-session-default"`: Use `express-session`'s own default store, which keeps sessions in memory. Not recommended: every session is lost when the process restarts, so a deploy signs everyone out, and memory use grows without bound. `express-session` itself advises against it outside development.
  - `presetOptions`  *[Object]*: Options to pass to the preset session store if one is selected. Only used if `instance` is not provided.
    - `checkPeriod` *[Number]*: How often, in milliseconds, Roosevelt clears sessions that have gone past `maxInactivity` out of the session store.
  - Either `instance` or `preset` must be set for this param to work properly.
  - `maxInactivity` *[Number]*: How long, in milliseconds, a session may go unused before Roosevelt deletes it from the session store. Default: `7889238000` (about 3 months). Only applies to Roosevelt's default session store.
    - This is separate from `expressSession.cookie.maxAge`, which decides how long a user stays logged in. Roosevelt sets that very far in the future by default so that active users are never logged out, which would otherwise mean abandoned sessions sat in the session store for just as long. `maxInactivity` lets you keep long-lived logins while still clearing out sessions nobody has come back to.
    - The clock resets every time a session is used, so a session belonging to an active user is never deleted no matter how old it is.
    - Sessions are swept on the interval set by `presetOptions.checkPeriod`. When a browser turns up with a cookie for a session that has since been deleted, Roosevelt clears that cookie so it does not linger until its own far off expiry.
    - If you prefer or your app depends on sessions pretty much never expiring, set this to `347126472000` (about 11 years) to match the `expressSession.cookie.maxAge` default.

Default: *[Object]*

```javascript
{
  filename: 'sessions.sqlite',
  instance: null,
  preset: 'default',
  presetOptions: {
    checkPeriod: 86400000 // one day
  },
  maxInactivity: 7889238000 // three months
}
```

- `formidable`: Parameters to pass to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing (file uploads). Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the upload directory when the request ends automatically. To keep any, be sure to move them before the request ends.

Default: *[Object]*

```javascript
{
  multiples: true // enables multiple files to be uploaded simultaneously
}
```

To disable multipart forms entirely, set `formidable` to `false`.

- `helmet` *[Object]*: Parameters to pass to the [helmet](https://github.com/helmetjs/helmet) module. This module helps secure Express apps by setting HTTP response headers.
  - The default options are specified in the [helmet docs](https://helmetjs.github.io/), with the following exceptions that Roosevelt makes to the default `Content-Security-Policy` settings:
    - The `upgrade-insecure-requests` directive has been removed. This change prevents [this bug](https://github.com/rooseveltframework/roosevelt/issues/964).
    - The `script-src` directive has been set to `"unsafe-inline"`. This makes it possible to use inline scripts.
    - The `form-action` directive has been set to `null`. This makes it possible to submit forms to other domains.
    - You can reverse any of these changes by configuring helmet yourself.
  - To disable helmet entirely, set the param to `false`.

- `logging`: Parameters to pass to [roosevelt-logger](https://rooseveltframework.org/docs/roosevelt-logger). See [roosevelt-logger parameters documentation](https://rooseveltframework.org/docs/roosevelt-logger/latest/configuration.html) for configuration options.

Default: *[Object]*

```javascript
{
  quieterStartup: false,
  methods: {
    http: true,
    info: true,
    warn: true,
    error: true,
    verbose: false
  }
}
```

- `logging.quieterStartup` *[Boolean]*: Show notices that repeat on every start at most once a day instead of every time. Default: `false`.
  - Some notices simply restate how the app is configured, such as which folder is being hosted or that build artifacts are switched off. Nothing is wrong, so seeing them on every restart while developing gets noisy.
  - Only those repeating notices are held back. Anything reporting an actual problem, such as a missing favicon or a file that failed to compile, always prints.
  - Roosevelt remembers which notices it has shown in your system's temp directory, so restarting the app does not bring them all back. Rebooting, or waiting a day, does.
  - Can also be set with the `--quieter-startup` or `-q` command line flags, or the `QUIETER_STARTUP` environment variable.

- `makeBuildArtifacts` *[Boolean or String]*: When enabled Roosevelt will generate user-specified directories, CSS/JS bundles, etc.
  - Defaults to `false` for apps created manually.
  - Will be set to `true` in apps generated with the app generator.
  - Can also accept a value of `"staticsOnly"` which will allow Roosevelt to create static files but skip the creation of the MVC directories.

- `incrementalBuilds` *[Boolean]*: When enabled Roosevelt will skip regenerating a static file if none of the source files it was built from have changed since the last build. This applies to files declared in the `copy` param too, which are left alone when neither the source nor the copy has changed. Default: `true`.
  - Set to `false` to disable the feature and rebuild everything on every start. Deleting your `buildFolder` has the same one-time effect.

- `routePrefix` *[String]*: A prefix prepended to your application's routes. Applies to all routes and static files. Default: `null`.
  - Example: When set to `"foo"` a route bound to `/` will be instead be bound to `/foo/`.
  - This prefix is exposed via the `routePrefix` Express variable which should be used for resolving the absolute paths to statics programmatically.
    - Example: An image located at `/images/teddy.jpg` can be resolved in a prefix-agnostic way via `${app.get('routePrefix')}/images/teddy.jpg`.

- `viewEngine` *[String]*: What templating engine to use, formatted as `"fileExtension: nodeModule"`.
  - Defaults to `"none"` for apps created manually.
  - Will be set to `"html: teddy"` in apps generated with the app generator.
  - Also by default when using the app generator, the [teddy](https://rooseveltframework.org/docs/teddy) module is marked as a dependency in `package.json`.
  - To use multiple templating systems, supply an array of engines to use in the same string format. Each engine you use must also be marked as a dependency in your app's `package.json`. Whichever engine you supply first with this parameter will be considered the default.

Example configuration using multiple templating systems: *[Object]*

```javascript
{
  viewEngine: [
    'html: teddy',
    'php: php',
    'ejs: ejs'
  ]
}
```
