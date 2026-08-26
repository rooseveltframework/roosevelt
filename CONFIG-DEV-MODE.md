# Development mode options

These features are only available in development mode.

- `watchStatics` *[Object]*: Settings for rebuilding your static files as you edit the files they are built from, then reloading the browser once that is done.
  - Options:
    - `enable` *[Boolean]*: Whether or not to enable this feature.
    - `additionalPaths` *[Array of Strings]*: Directories to watch on top of the ones Roosevelt already knows your static files are built from. Relative paths are resolved against your app directory. Use this when something outside your statics feeds into a page, such as a folder of content files.
    - `debounce` *[Number]*: How long in milliseconds to wait for a burst of file changes to finish arriving before rebuilding. Saving one file usually reports more than one change, so this stops a single save from starting several rebuilds.

  What gets watched is `staticsRoot` along with the source paths for your HTML, CSS, JS, and views. Your public folder and build folder are skipped, since Roosevelt writes to them itself and watching them would make a build trigger another build.

  Files your app would not commit are skipped too: Roosevelt's own list of things like `node_modules`, `.DS_Store`, and `Thumbs.db`, plus whatever your `.gitignore` names. Naming a folder there skips everything inside it, which is worth doing for anything your own build steps generate inside your statics, since editing it would otherwise start another rebuild.

  Controllers and models are not watched. Changing those means restarting the process, which is what a process watcher such as [nodemon](https://nodemon.io) is for, and Roosevelt cannot reload code it has already loaded. If you use one alongside this feature, it is worth narrowing it to your server-side files so that editing a stylesheet no longer restarts your whole app.

  Only the static files whose sources actually changed are rebuilt, unless `incrementalBuilds` is disabled.

Default: *[Object]*

```javascript
{
  enable: true,
  additionalPaths: [],
  debounce: 100
}
```

- `frontendReload` *[Object]*: Settings to use for the browser reload feature which automatically reloads your browser when your frontend code changes.
  - Options:
    - `enable` *[Boolean]*: Whether or not to enable this feature.
    - `exceptionRoutes` *[Array of Strings]*: List of routes to exclude from this feature.
    - `expressBrowserReloadParams` *[Object]*: Params to pass to [express-browser-reload](https://rooseveltframework.org/docs/express-browser-reload). This feature will only be active on pages with a `<body>` tag.

Default: *[Object]*

```javascript
{
  enable: true,
  exceptionRoutes: [],
  expressBrowserReloadParams: {
    skipDeletingConnections: true
  }
}
```

- `htmlValidator` *[Object]*: Parameters to send to [express-html-validator](https://rooseveltframework.org/docs/express-html-validator).
  - `enable` *[Boolean]*: Enables or disables the built-in HTML validator.
  - `exceptions` *[Object]*: A set of params that can be used to prevent validation in certain scenarios.
    - `header` *[String]*: A custom header that when set will disable the validator on a per request basis.
    - `modelValue` *[String]*: An entry in your data model passed along with a `res.render` that when set will disable validation on the rendered HTML.
  - `validatorConfig` *[Object]*: [html-validate configuration](https://html-validate.org/usage/#configuration) that determines what errors the validator looks for.
    - The full list of available validator rules can be found [here](https://html-validate.org/rules/).
    - This configuration can also be set by a `.htmlValidate.json` file placed in your app root directory.
  - You may also want to override the version of [html-validate](https://www.npmjs.com/package/html-validate) this module ships with by default, since that module has had a history of updating faster than this one does at times. To do so, set this in your app's `package.json`:

```json
"overrides": {
  "html-validate": "x.y.z"
}
```

Where `x.y.z` is your desired version. After doing so, delete your `node_modules` folder and `package-lock.json` then run `npm i` to install the override.

- `mode` *[String]*: Decides whether your app starts in production mode or development mode by default. Default: `production`.

Default: *[Object]*

```javascript
{
  enable: true,
  exceptions: {
    requestHeader: 'Partial',
    modelValue: '_disableValidator'
  },
  validatorConfig: {}
}
```

- `deprecationChecks`: *[String]* or *[Boolean]*: Whether or not to run the deprecation checker in Roosevelt. The deprecation checker is a script that runs when your app starts to determine if you have code targeting an older version of Roosevelt that needs to be refactored. Default: `'development-mode'`, which runs the checks in development mode only. Set to `true` to run them in every mode, or `false` to disable them entirely.
  - Most checks read your Roosevelt config. A few also read your controllers, views, and models, looking for app code written against something that has since changed. Nothing outside those directories is read, so your `node_modules` and build output are never searched.
