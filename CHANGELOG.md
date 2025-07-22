## 0.31.4

- Fixed a bug in the CSRF handler.
- Updated dependencies.

## 0.31.3

- Added warning to the debug markup on 403 "forbidden" POST error pages instructing the user to include the CSRF token in their request.
- Fixed a bug that could cause `undefined` to print on error pages in certain circumstances.
- Updated dependencies.

## 0.31.2

- Fixed bug that caused cookie parser to not load under certain circumstances.
- Updated dependencies.

## 0.31.1

- Changed `expressSession` default to `true` so that `csrfProtection`'s default being `true` will actually function.
- Updated dependencies.

## 0.31.0

- Breaking: `npm run generate-csrf-secret` script removed, as it is no longer necessary due to an internal switch of Roosevelt's CSRF dependency from `csrf-csrf` to `csrf-sync`. You should delete any `csrfSecret.json` files in your `secrets` directory after upgrading Roosevelt, as the file is no longer needed. You should also remove the `npm run generate-csrf-secret` from your package.json.
- Added `expressVersion` param which lets you decide which version of [Express](https://expressjs.com) to use. Choose between either `4` or `5`. This option exists because there are [significant differences](https://expressjs.com/en/guide/migrating-5.html) between Express 4 and Express 5. Default: `5`.
- Added glob pattern support to CSRF route exemption param.
- Removed `enableCLIFlags` param which has been obsolete for some time and didn't actually do anything.
- Changed the deprecation checker to only run in development mode and added a new param `deprecationChecks` that will let you disable it entirely.
- Updated dependencies.

## 0.30.7

- Added new `onBeforeControllers` event.
- Added new `html.folderPerPage` param.
- Made it easier to debug HTML validation errors on static sites.
- Fixed bugs associated with the `stopServer()` method.
- Fixed bugs associated with using a `roosevelt.config.json` file in your app.
- Fixed a bug that could cause middleware errors not to flow through the middleware stack correctly.
- Copyedited documentation significantly.
- Updated dependencies.

## 0.30.6

- Added `onBeforeStatics` event.
- Altered `makeBuildArtifacts` log to be a warning.
- Fixed writing JS file log to be properly classified as `info` instead of `log`.
- Fixed a bug that could cause the static site generator to not write new files even if the file has changed.
- Updated dependencies.

## 0.30.5

- Added error handling for if you supply Roosevelt constructor params to `initServer` or `startServer`.
- Fixed bugs that could cause `initServer`, `startServer`, and `stopServer` to not be properly awaitable.
- Fixed bug that would cause `undefined` to print on error pages in Roosevelt apps without a package.json version defined.
- Updated dependencies.

## 0.30.4

- Fixed bugs that prevented CSS source maps from working correctly.
- Updated dependencies.

## 0.30.3

- Fixed model overriding precedent in static site generator.

## 0.30.2

- Fixed a crash associated with the default catch-all route.

## 0.30.1

- Fixed a bug that caused two catch-all routes to appear in the router stack.
- Updated dependencies.

## 0.30.0

- Breaking: Upgraded to Express 5.x.
  - To migrate:
    - Most Roosevelt apps probably only need to change `*` routes to `*all`.
    - Apps that use more complex routing may need other changes.
    - Full list of considerations for migrating to Express 5: https://expressjs.com/en/guide/migrating-5.html
- Added `expressSessionStore` Express variable, which is the session store instance used by express-session module Roosevelt uses internally.
- Added support for catch-all `*` in static site generator model definitions.
- Updated dependencies.

## 0.29.5

- Added new `copy` param that will copy files from a source location to a destination location.
- Added new feature to integrated webpack bundler to disable LICENSE.txt generation by default. This can be overridden by supplying your own `optimization` param to your webpack config.
- Improved docs.
- Updated dependencies.

## 0.29.4

- Added first-line comment blocklist support to the static site generator.
- Added static site generator folder to the `require` module path.
- Added async/await support for static site models.
- Updated dependencies.

## 0.29.3

- Fixed a bug that could cause some routes not to load.
- Fixed a bug that could cause more than one `*` route to end up in the router stack.
- Updated dependencies.

## 0.29.2

- Fixed a bug that would cause `MAKE_BUILD_ARTIFACTS` to supersede the `--build` CLI flag.
- Fixed a bug that would cause an error to falsely print about not being able to create symlinks.
- Updated dependencies.

## 0.29.1

- Fixed bugs associated with `MAKE_BUILD_ARTIFACTS` sometimes not working properly.
- Updated dependencies.

## 0.29.0

- Breaking: Moved default output location for `clientControllers` and `clientViews` to the `.build` folder.
  - To migrate your app, you will likely need to change `js.webpack.bundles.config.resolve.modules` to replace any entry that has `"${publicFolder}/js"` with `"${buildFolder}/js"`.
- Breaking: Changed default of `preprocessedViewsPath` param from `".build/.preprocessed_views"` to `".build/preprocessed_views"` and changed default of `preprocessedStaticsPath` param from `".build/.preprocessed_statics"` to `".build/preprocessed_statics"`.
- Added `buildFolder` param to customize the name of the `.build` folder.
- Altered output of `controllersBundler` and `viewsBundler` feature to produce files that are easier to read.
- Updated dependencies.

## 0.28.1

- Fixed a bug where HTTPS certs wouldn't always automatically generate when they should.
- Updated various dependencies.

## 0.28.0

- Breaking: Removed config auditor feature.
- Added more checks to the deprecation checker.
- Updated dependencies.

## 0.27.0

- Breaking: Changed `http/s` param structure:
  - Changed `port` param to `http.port` and changed the default to `43763`.
  - Changed `https.port` param default to `43711`.
  - Removed `https.force` param. Non-secure `http` can now be disabled via `http.enable` being set to false.
  - Removed `authInfoPath`, `passphrase`, `caCert`, `requestCert`, and `rejectUnauthorized` params. Replaced them with `options` where you can pass any [native option](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions).
    - The `ca`, `cert`, `key`, and `pfx` params can take file paths relative to your `secretsDir` in addition to everything else natively supported (strings, buffers, and arrays of strings or buffers).
    - The file paths get resolved within arrays if you pass arrays to any of those as well.
  - These collective changes mean most Roosevelt apps will need to alter their Roosevelt configs from something that looks like:

    ```
    "port": 19679,
    "https": {
      "enable": true,
      "port": 19679,
      "force": true,
      "authInfoPath": {
        "authCertAndKey": {
          "cert": "cert.pem",
          "key": "key.pem"
        }
      }
    },
    ```
  - To be something like this instead:

    ```
    "http": {
      "enable": false
    },
    "https": {
      "enable": true,
      "port": 19679,
      "options": {
        "cert": "cert.pem",
        "key": "key.pem"
      }
    },
    ```
- Breaking: Changed behavior of `NODE_PORT` environment variable to now set `https` port when `https` is enabled and fall back to `http` if `https` is disabled.
- Breaking: Moved the versioning of webpack from Roosevelt itself to the app. You will need to declare webpack as a dependency in your app if you intend to use the JS bundler feature in Roosevelt.
- Breaking: Changed `js.webpack.bundles.env` param to require values `development` or `production` instead of `dev` or `prod`.
- Breaking: Changed `js.webpack.bundles.verbose` param to `js.verbose`.
- Breaking: Changed `--webpack`, `--wp`, and `--w` CLI flags to `--jsbundler`, `--jsb`, and `--j` respectively.
- Breaking: Changed default of `preprocessedViewsPath` param from `'mvc/.preprocessed_views'` to `'.build/.preprocessed_views'` and changed default of `preprocessedStaticsPath` param from `'.preprocessed_statics'` to `'.build/.preprocessed_statics'`. Collectively these changes mean most Roosevelt apps should remove `.preprocessed_views` and `.preprocessed_statics` from `.gitignore` and add `.build` instead.
- Added new param `js.customBundler` that will let you define a custom JS bundler.
- Added new param `js[bundler].customBundlerFunction` that will let you define custom behavior for default supported JS bundlers like Webpack.
- Updated dependencies.

## 0.26.1

- Added new Express variable `debugMarkup` that contains HTML you can add to your custom error pages if you define any that will print server errors if any exist, display the route list, add some inline JavaScript that will serialize the request's `err`, `req`, and `res` objects so you can interactively examine them in the browser's developer tools. Only available in development mode.
- Added the aforementioned debug markup to the default error pages in development mode as well.
- Added `routes` Express variable which will list all routes in the app.
- Added new recognized environment variable: `MAKE_BUILD_ARTIFACTS` will allow you to set Roosevelt's `makeBuildArtifacts` config.
- Added new param `minifyHtmlAttributes`: Settings to pass to [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes).
  - Options:
    - `enable`: Whether or not to enable `minify-html-attributes`.
      - Default: *[Boolean]* `false`.
      - Available options:
        - `'production'`: Enable only in production mode.
        - `'development'`: Enable in all modes.
        - `true`: Will be taken to mean `'production'`.
    - `minifyHtmlAttributesParams`: Params to pass to [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes).
      - Default: *[Object]* `{}`
  - Default: *[Object]*

    ```json
    {
      "enable": true,
      "minifyHtmlAttributesParams": {}
    }
    ```
  - Note: Roosevelt will always override 3 params from [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes):
    - `htmlDir` will always be set to Roosevelt's `preprocessedViewsPath`.
    - `cssDir` will always be set to Roosevelt's `preprocessedStaticsPath`.
    - `jsDir` will always be set to Roosevelt's `preprocessedStaticsPath`.
- Added new param `preprocessedStaticsPath`: Relative path on filesystem to where your preprocessed static files will be written to. Preprocessed static files are view files that have been preprocessed by the [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes) module, if you have `minifyHtmlAttributes` enabled.
  - Default: *[String]* `".preprocessed_statics"`.
  - This feature will only be active if `minifyHtmlAttributes` is enabled.
- Replaced `isomorphicControllers` param with `clientControllers` param and made it function similarly to `clientViews`.
- Fixed a bug with displaying app version on default error pages.
- Fixed a bug that could lead to a counter-intuitive error if your template rendered an empty response in dev mode.
- Updated various dependencies.

## 0.26.0

- Breaking: Added new param `preprocessedViewsPath`: Relative path on filesystem to where your preprocessed view files will be written to. Preprocessed view files are view files that have had their uses of web components progressively enhanced using the [progressively-enhance-web-components](https://github.com/rooseveltframework/progressively-enhance-web-components) module.
  - Default: *[String]* `"mvc/.preprocessed_views"`.
  - To disable this feature, set the value to `false`.
  - This is breaking because if you leave it enabled by default (recommended), you will need to add `.preprocessed_views` to your `.gitignore`.
- Breaking: Switched to external source maps for the CSS preprocessor. This necessitated changing the custom CSS preprocessor API to require returning an object instead of a string.
  - If you have written a custom CSS preprocessor, the new return value is:

    ```javascript
    return {
      css: 'write code to output css here',
      sourceMap: 'write code to output source map here (optional)'
    }
    ```
- Added new param `prodSourceMaps` to allow source maps to be generated in prod mode for both CSS and JS.
- Added IP address to the output when the server starts.
- Added new CLI script `secretsGenerator.js` that allows you to combine `certsGenerator.js`, `csrfSecretGenerator.js`, and `sessionSecretGenerator.js` into one command.
- Added feature to override `appDir` and `secretsPath` for the CLI scripts using `--appDir somewhere` and `--secretsPath somewhere` CLI flags.
- Added `exceptionRoutes` option to the `frontendReload` param.
- Added a check for broken symlinks in the public folder, which will be purged if any exist.
- Added support for placing your Roosevelt config in a `roosevelt.config.json` file in addition to the previous options.
- Added better error when attempting to start a Roosevelt app on a file system that does not support symlinks.
- Changed source maps from inline to external.
- Fixed a bug that caused the JS bundler to not log when it was writing JS files.
- Fixed a bug that caused a `statics/pages` directory being created when it isn't needed.
- Fixed a bug that could cause the public folder and statics folder to be created even when `makeBuildArtifacts` is disabled.
- Fixed a bug that caused the views bundler and isomorphic controllers finder to write a new views bundle to disk even when it wasn't needed.
- Fixed `frontendReload` not working in Firefox with the default HTTPS config.
- Updated various dependencies.

## 0.25.0

- Breaking: Supplying an `allowlist` to the views bundler will now implicitly disable `exposeAll`.
- Breaking: Renamed `secretsDir` param to `secretsPath`.
- Updated all file path express variables to include full absolute paths.
- Fixed various bugs in the views bundler feature.
- Fixed a rare bug where CSRF and session secrets could be written to the wrong directory.
- Fixed a bug where HTTPS certs could be automatically generated when they shouldn't be.
- Updated various dependencies.

## 0.24.0

- Breaking: Altered `startServer` and `initServer` methods to now be async. They now need to be awaited to avoid possible race conditions.
  - As a result, starting the app in a single line needs to be updated to `await (require('roosevelt').startServer())`.
  - Callback arguments have been removed from these methods as well.
- Breaking: Removed `app.get('routes')`, `onReqAfterRoute`, `onReqBeforeRoute`, `onReqStart`, and `onStaticAssetsGenerated`.
- Breaking: Renamed `app.httpServer` to `app.get('httpServer')` and `app.httpsServer` to `app.get('httpsServer')`.
- Breaking: Added `enable` param to `clientViews`. If your app uses the `clientViews` feature, you will need to add this param to continue using the feature.
- Added new method `onBeforeMiddleware`.
- Added `start` and `stop` method shorthands for `startServer` and `stopServer` respectively.
- Refactored various things under the hood to improve code quality, performance, and reduce unnecessary dependencies.
- Updated various dependencies.

## 0.23.2

- Removed `toobusy` feature since it is temperamental and the dependency is no longer maintained.
- Refactored internal `wildcardMatch` to use `minimatch` under the hood.
- Replaced `html-minifier` with `html-minifier-terser` since `html-minifier-terser` is better-maintained.
- Updated various dependencies.

## 0.23.1

- Added feature that scans the router stack to move the 404 route (the `*` route) to the end of the stack every time a new route is added, even if the route is added at runtime so that you can dynamically add routes while the app is running.
- Updated various dependencies.

## 0.23.0

- Removed `cores` feature since it is largely redundant now thanks to the widespread popularity of tools like pm2. Also removed various deprecated cluster module support as well.
- Updated various dependencies.

## 0.22.16

- Made it possible to disable `helmet` by setting the `helmet` param to false.
- Updated various dependencies.

## 0.22.15

- Added option to exempt certain routes from CSRF protection.
- Updated various dependencies.

## 0.22.14

- The JS bundler will now add `mode: "development"` and `devtool: "source-map"` automatically to your Webpack bundles in development mode.
- Updated various dependencies.

## 0.22.13

- Altered helmet's defaults again. The `form-action` directive has been set to `null`. This makes it possible to submit forms to other domains in production mode.

## 0.22.12

- Added `'unsafe-inline'` option to helmet's `Content-Security-Policy`'s `script-src` directive by default in Roosevelt. This will prevent inline scripts from being blocked in production mode.
- Updated various dependencies.

## 0.22.11

- Added `DISABLE_HTTPS` environment variable which when set to `true`, the HTTPS server will be disabled and the app will revert to HTTP regardless of what is set in the `rooseveltConfig`.
- Updated various dependencies.

## 0.22.10

- Enabled WAL in the SQLite instance used for session storage by default.
- Updated various dependencies.

## 0.22.9

- Fixed an issue with cert generation from CLI scripts properly this time.

## 0.22.8

- Fixed an issue with cert generation from CLI scripts.
- Updated various dependencies.

## 0.22.7

- Added a max age to the default express-session configuration.
- Fixed an issue with cert generation in production mode.
- Updated various dependencies.

## 0.22.6

- Fixed a bug that caused self-signed certs to get regenerated every time the app restarted.
- Updated various dependencies.

## 0.22.5

- Certs generator will now run in production mode as well if `https` is enabled and if the files do not already exist. This behavior can be suppressed by setting `https.autoCert` to `false`.
- Fixed bug that prevented the static site generator feature from working in dev mode when the HTML validator was enabled.
- Fixed README formatting typos.
- Updated various dependencies.

## 0.22.4

- Made it possible to set `expressSession` to `true` which will set a sane default config so you don't have to spell one out.

## 0.22.3

- Updated default session store to use SQLite instead of an in-memory database so that sessions are not invalidated when the server restarts.
- Updated various dependencies.

## 0.22.2

- Fixed a bug that caused self-signed certs to get regenerated every time the app restarted.
- Updated various dependencies.

## 0.22.1

- Exposed the `express-session` middleware for use in Roosevelt apps.
- Updated various dependencies.

## 0.22.0

- Breaking: Added a unified `secrets` directory for various app secrets such as HTTPS certs, session secret, CSRF secret, etc. The name of the directory is configurable, but when upgrading an app from the previous version, you may need to alter your rooseveltConfig to remove directories from your `cert` or `key` paths. You must now specify only a file name in those params.
- Added support for `express-session` for session support.
- Added CSRF protection.
- Improved dev sync script for developing Roosevelt significantly.
- Updated various dependencies.

## 0.21.16

- Fixed an issue that could cause the server to start before all the controller routes were loaded.
- Updated various dependencies.

## 0.21.15

- Updated various dependencies.

## 0.21.14

- Updated various dependencies.

## 0.21.13

- Certs will be auto-generated in dev mode now if they don't exist.
- Various dependencies updated.

## 0.21.12

- Fixed isomorphic controllers bundler webpack bug in Windows.
- Various dependencies updated.

## 0.21.11

- Added a new `--build` CLI flag that will instruct Roosevelt to just build the build artifacts but not start the server.
- Added new `onStaticAssetsGenerated` event that is fired when the server finishes init but before the server starts.
- Fixed an issue that would cause the server to start even when `makeBuildArtifacts` is set to `staticsOnly`. This has the side effect of causing `serverStart()` to revert to the behavior of `init()` if `makeBuildArtifacts` is set to `staticsOnly`.
- Fixed a bug that would cause roosevelt-router to produce a false negative when detecting teddy.
- Various dependencies updated.

## 0.21.10

- Added `--webpack=verbose` and `--wp=verbose-file` CLI flags to make it easier to see verbose webpack errors. Available shorthands: `--wp` and `-w`.
- Added detection of undefined template literal variables (e.g. via typo) in rooseveltConfig.
- Added more helpful error if starting an app with broken symlinks.
- Various dependencies updated.

## 0.21.9

- Fixed frontend reload when https is enabled with self-signed certs.
- Removed parent-require dependency.
- Added new `dev_sync.sh` to make writing code for Roosevelt easier. See instructions on how to use it in the README.
- Various dependencies updated.

## 0.21.8

- Added wildcard matching to views bundler feature.
- Fixed bug that could cause build artifact generation to crash starting the app.
- Various dependencies updated.

## 0.21.7

- Fixed CSS preprocessor breaking on Windows when using the default configuration in a newly generated app.
- Various dependencies updated.

## 0.21.6

- The `certs-generator` script's default name has been changed to `generate-certs`. The config auditor will now expect it to be named that.
- The `config-audit` script's default name has been changed to `audit-config`. The config auditor will now expect it to be named that.
- `allowlist` in CSS preprocessor now supports wildcard matching, e.g. `dir/*`.
- Various dependencies updated.

## 0.21.5

- `allowlist` and `blocklist` in static site generator feature now supports wildcard matching, e.g. `dir/*`.
- Various dependencies updated.

## 0.21.4

- Added `allowlist` and `blocklist` to the static site generator feature.
- Fixed bug with the static site generator feature that required absolute paths for including child templates in a main template.
- Various dependencies updated.

## 0.21.3

- When `versionedPublic` is true, Roosevelt will no longer deposit static HTML pages into the versioned directory.
- Various dependencies updated.

## 0.21.2

- Fixed bug where the config auditor would complain about the `makeBuildArtifacts` param being set to string.
- Static site generator will now run the HTML validator against rendered templates in dev mode only.
- Various dependencies updated.

## 0.21.1

- Static site generator can now be supplied models by file instead of by configuration. If model data is not supplied by configuration, Roosevelt will try to automatically load a model from a JS file with the same name alongside the template if it exists instead.
- Static site generator will now run the HTML validator against rendered templates.
- Bumped CI Node versions.

## 0.21.0

- Breaking: `htmlMinifier` param renamed and expanded to `html`. You will need to update your Roosevelt config.
  - Added feature `html.sourcePath`, `html.models`, and `html.output` which lets you generate static HTML pages from the your statics directory by compiling them with a view engine and depositing the output to the public folder at start time.
- Fixed issue with `symlinks` that would cause symlinking to a file rather than a directory to fail in Windows.
- Some error message copyediting.
- Some minor refactoring and documentation fixes.
- Various dependencies updated.

## 0.20.1

- `makeBuildArtifacts` will now accept a new value of `'staticsOnly'` which will allow Roosevelt to create static files but skip the creation of the MVC directories.
- `initServer` can now also be called as `init` instead.
- Various dependencies updated.

## 0.20.0

- Breaking: Renamed `generateFolderStructure` to `makeBuildArtifacts`.
- Various dependencies updated.
  - Breaking: Among them, `formidable` was updated which is a breaking change for any app that takes file uploads as [property names in req.files have been renamed](https://github.com/node-formidable/formidable/blob/master/CHANGELOG.md#200), most notably `file.path` is now `file.filepath` and `file.name` is now `file.originalname`.
- Removed `checkDependencies`.

## 0.19.14

- Fixed bug that required admin permissions to start an app in Windows.

## 0.19.13

- Added script to generate self-signed HTTPS certs:
  - `npm run certs-generator`: Generates self-signed HTTPS certs for your app.
    - Default shorthand:
      - `npm run c`
    - Script is short for: `node ./node_modules/roosevelt/lib/scripts/certsGenerator.js`
- Some refactoring.
- Various dependencies updated.

## 0.19.12

- Various dependencies updated.
  - Migrated colors to @colors/colors.

## 0.19.11

- Fixed bug that caused isoRequire to only work with absolute paths.
- Various dependencies updated.

## 0.19.10

- Added `roosevelt-router` feature to improve support for writing isomorphic code for SPAs.
- Added `isomorphicControllers` config option that will permit Roosevelt to make a list of all your controller files that can be used client-side as well so they can be auto-loaded client-side too.
- Altered `clientViews` such that the template list will lack file extensions if the file extension of the template matches the default view engine's file extension.
- Breaking: Default `clientViews` output bundle changed from bundle.js to views.js.
- Fixed confusing console warning.
- HTML validator frontend scripts moved to `<head>`.
- Various dependencies updated.

## 0.19.9

- Made Webpack errors less verbose.
- Various dependencies updated.

## 0.19.8

- Updated for support for Node 16.x. This required a migraiton from node-sass to dart-sass.
- Dropped official Node 15 support, though it will probably still work. Node 14 remains officially supported.
- Various dependencies updated.

## 0.19.7

- `clientViews` `allowlist` now allows directories.
- Default command line flags and environment variables recognized by Roosevelt can now be overridden via source-configs.
- Various dependencies updated.

## 0.19.6

- Added `onAppExit` event.
- Fixed bug with https feature.
- Various dependencies updated.

## 0.19.5

- Fix for Node 15 / npm 7 regression. Config auditor and deprecation checker will no longer run as postinstall scripts to compensate for INIT_CWD being removed from npm. These checks will be run exclusively on application first run instead (or any time the public folder is removed). (Closes https://github.com/rooseveltframework/roosevelt/issues/975)
- Dropped Node 12 support.
- Various dependencies updated.

## 0.19.4

- Fixed bug that caused Roosevelt to not listen to `NODE_ENV`.
- Moved symlink creation to a separate step and made happen earlier in the app initialization process to maek it easier to work with the various Roosevelt server starting events.
- Various dependencies bumped.

## 0.19.3

- Fixed bug which could cause CSS preprocessor to fail if there are subdirectories in your CSS folder.
- Various dependencies bumped.

## 0.19.2

- Breaking: `clientViews` no longer exports a function, instead exporting a JSON object.
- Breaking: `clientViews` will no longer minify templates by default.
- Fixed bug with `clientViews` `exposeAll` feature that would cause it to scoop up any system files that might be present in your views directories.
- Fixed bug with `clientViews` blocklist mistakenly defaulting to an object instead of an array which could cause crashes in some configurations.
- Fixed bug with CSS preprocessor that would cause it to scoop up any system files that might be present in your CSS directories.
- Various dependencies bumped.

## 0.19.1

- Added ability to configure helmet dependency.
- Fixed bug that caused frontend reload not to work.
- Fixed a bug in the Express `env` variable that would cause it to be incorrectly set at times.
- Updated some out of date into in the README.
- Removed some unnecessary code.
- Various dependencies bumped.

## 0.19.0

- Breaking: Production mode behavior [changed significantly](https://github.com/rooseveltframework/roosevelt/issues/934):
  - `localhostOnly` and `alwaysHostPublic` defaults were flipped to false and true respectively.
  - `alwaysHostPublic` was renamed to `hostPublic`.
  - The `--host-public` command line flag was removed, since it is no logner needed because `hostPublic` defaults to true now.
  - New command line flag added called `production-proxy` to let you opt-in to `localhostOnly` and `alwaysHostPublic` being set to true and false respectively as before.
- Various dependencies bumped.

## 0.18.3

- You can now [use PHP as your templating engine](https://github.com/rooseveltframework/node-php-runner) in a Roosevelt app or any other Express application. PHP should be faster than any JS-based templating engine for complex templates since its parser is written in C rather than JS.
- Breaking: blacklist/whitelist params throughout the API have been renamed to blocklist/allowlist.
- README was copyedited to improve the clarity of the default behaviors of some of the API, remove outdated information, and other small improvements.
- The host-public warning was made more prominent so that production mode default behavior regarding statics is less confusing to people.
- CI improvements.
  - Breaking: Roosevelt is no longer tested on Node 10.x. We didn't do anything to explicitly break older Node versions, but use at your own risk.
- Various dependencies bumped.

## 0.18.2

- Added [helmet](https://github.com/helmetjs/helmet) middleware to improve security by default.
- Replaced `body-parser` middleware with native Express integration.
- Various dependencies bumped.

## 0.18.1

- Changed `passphrase` option from `https.p12.passphrase` to `https.passphrase` so it can be used for certAndKey configurations as well.
- CI improvements.
- Various dependencies bumped.

## 0.18.0

- Replaced the vnu-jar based HTML validator with express-html-validator 🎉.
  - Roosevelt no longer does any background process management as a result.
- Moved all developer facing dependencies to optionalDependencies.
  - They can be omitted from installion when using `npm i --no-optional`.
- Refactored frontend reload implementation.
- check-dependencies now only runs in dev mode.
- API changes:
  - Removed `separateProcess` from `htmlValidator`.
  - Removed `port` from `htmlValidator`.
  - Removed `showWarnings` from `htmlValidator`.
  - Added `validatorConfig` to `htmlValidator` which respresents a set of rules for the validator to check for.
    - Rules can also be set in a `.htmlValidate.json` placed in the app root.
  - Removed `verbose` from `frontendReload`.
    - These logs are now controlled by the general verbose logging param.
  - Removed `ROOSEVELT_VALIDATOR` environment variable.
  - Removed `ROOSEVELT_AUTOKILLER` environment variable.
  - Removed `--attach-validator` and `-a` cli flags.
  - Removed `--background-validator` and `-b` cli flags.
  - Removed `--disable-validator-autokiller`, `--no-autokiller`, and `-n` cli flags.
  - Removed `--enable-validator-autokiller`, `--html-validator-autokiller`, and `-k` cli flags.
- Removed dependencies:
  - execa
  - fkill
  - html-validator
  - prismjs
  - ps-node
  - tamper
  - vnu-jar
- Various dependencies bumped.

## 0.17.1

- Fixed a CSS bug where CSS files were still not being written due to a file existence check.
- Fixed a CSS bug where empty CSS files were being written because their LESS equivalent would never generate CSS in that particular file.
- Various dependencies bumped.

## 0.17.0

- Breaking: Replaced `staticsSymlinksToPublic` with `symlinks`.
- Breaking: Replaced `routers` param with a simplified `routePrefix` param which defines a subfolder to mount the app to.
- Breaking: Renamed `multipart` param to `formidable`.
- Added ability to configure Roosevelt via a rooseveltConfig.json config file placed in app root instead of from a rooseveltConfig object in package.json.
- Added `router` Express variable that opens up access to internally used router instance.
- Added `routePrefix` Express variable that exposes currently used routePrefix or an empty string if not used.
- Fixed bug where changes to CSS files were not being written to the output directory.
- Refactored internal `fsr` module.
- Updated internal usage of formidable API.
- Internal changes to stabilize the automated tests.
- Various dependencies bumped.

## 0.16.2

- Added deprecation check for old compiler sub modules.
- Various dependencies bumped.

## 0.16.1

- Stopped the config auditor from complaining about obsolete scripts.
- Fixed cases where some CLI flags weren't being applied to config.
- Test fixes.
- Various dependencies bumped.

## 0.16.0

- Replaced browserify with webpack. **This has significant breaking API changes. You will need to totally rewrite your JS bundles from browserify bundles to webpack bundles to upgrade to this version of Roosevelt. It is also recommended that you remove all references to old build artifacts such as `.build` and `.bundled` in your application as well from package.json, .gitignore, etc.**
- Eliminated concept of separate JS compilers in favor of declaring this via your webpack config. Note: webpack defaults to minifying JS using terser.
- Eliminated concept of CSS preprocessor middleware modules in favor of built-in support for LESS, Sass, and Stylus. Other CSS preprocessors can be used as well with a bit of extra configuration.
- API changes:
  - Removed `symlinkToPublic`, `compiler`, `output`, `whitelist`, and `blacklist` params from `js`.
  - Replaced `js.bundles` with `js.webpack`.
  - Removed `css.symlinkToPublic`.
  - Replaced `css.compiler.params.cleanCSS` with `css.minifier`.
  - Added `css.compiler.enable`.
  - Replaced `css.compiler.nodeModule` with `css.compiler.module`.
  - Replaced `css.compiler.params` with `css.compiler.options`.
  - `css.output` is now relative to `publicFolder` instead of `staticsRoot`.
  - `clientViews.output` is now relative to `publicFolder` instead of `staticsRoot`.
  - Removed `cleanTimer` (Obsolete in absense of `.build`).
- App cleaner has been removed.
- `source-configs` integration is now more tightly knit.
- Config auditor no longer complains about missing params.
- Auditor now checks config params on a case-by-case basis.
- ES6 style variables can now be used in `rooseveltConfig` referencing other `rooseveltConfig` entries.
- Introduced views bundler: An API that allows you to expose view code to frontend JS for client-side templating.
- Added a button to the validation error page to display the page anyway and another button to disable the validator entirely until the server restarts.
- Fixed bug with frontend reload causing it to inject the script tag in the wrong location in some situations.
- Fixed bug where `router` would cause app routes to fail when no controller files exist.
- Fixed bug where auto build scanner would crash the app when `generateFolderStructure` is false.
- Fixed bug which resulted in a cryptic error if a Roosevelt app was moved to another directory.
- Fixed bug where symlink failed errors would appear when `generateFolderStructure` is false.
- Complete rewrite of HTML validator and related helper scripts.
- Refactored multipart middlware.
- Various dependencies bumped.
- CI improvements.
- Many rewritten tests.

## 0.15.1

- Fixed bug causing apps to crash in dev mode.
- Various dependencies bumped.

## 0.15.0

- Moved CSS minification from [roosevelt-less](https://github.com/rooseveltframework/roosevelt-less) to Roosevelt using `clean-css` as a direct dependency. The `clean-css` library had an update with breaking changes so the `rooseveltConfig` params in `advanced` and `aggressiveMerging` in `cleanCSS` are now outdated.
- New default script `npm run proddev`: Runs the app in production mode, but with the public folder hosted by the Roosevelt app. This is useful for doing development in production mode without having to stage a complex simulation of your production environment, which would likely include hosting static files via another web server better-suited to serving statics like Apache or nginx.
- Roosevelt now sources configs internally using [source-configs](https://github.com/rooseveltframework/source-configs).
- Validator will now be disabled if `HTTP_PROXY` or `HTTPS_PROXY` are set but localhost is not in `NO_PROXY`.
- Fixed a bug where not having `devDependencies` or `dependencies` objects in your app's package.json would throw errors when installing dependencies. Accordingly re-reverted most changes in 0.14.1 to fix buggy behavior with `devDependencies` in npm installs.
- The `check-dependencies` call will now only apply to production dependencies.
- Some internal refactoring to clean things up.
- Various dependencies bumped.

## 0.14.6

- Fixed a bug that caused `devDependencies` of Roosevelt to be removed if `npm i` was run more than once.
- Fixed a bug that caused the automated testing to break if your clone of Roosevelt was not named "roosevelt."
- Various dependencies bumped.

## 0.14.5

- `staticsSymlinksToPublic` will now create missing subdirectories necessary to create a symlink in a target location.
- Fixed a bug which caused Java hs_err_pid error logs to pile up in your app directory under certain conditions.
- Fixed a bug which caused frontend reload to not work on the various error pages.
- Added code comment above frontend reload script tag to explain that it is injected by Roosevelt.
- Did some copyediting on frontend reload logging.
- Various dependencies bumped.

## 0.14.4

- Added automatic browser reloading when your frontend code changes (via [reload](https://github.com/alallier/reload)).
- A console warning will now appear explaining why public static assets don't load in prod mode when alwaysHostPublic is set to false (the default).
- New Express variable added: `routes` containing a list of all routes loaded in the application.
- Various dependencies bumped.
- CI improvements.

## 0.14.3

- Restored move of several things to devDependencies to shrink production builds. Feature is now activated using `ROOSEVELT_DEPLOYMENT` environment variable. There are also new corresponding `npm run` commands `dev-install` and `dev-prune` to manage this. See README for more details.
- Copyediting on several logs to improve clarity.
- Various dependencies bumped.
- CI improvements.

## 0.14.2

- Reverted most changes in 0.14.1 to fix [#713](https://github.com/rooseveltframework/roosevelt/issues/713), but preserved modularization of htmlValidator.js so that if any devDependencies are missing, the app will not crash in production mode.
- Various dependencies bumped.

## 0.14.1

- Moved several things to devDependencies to shrink production builds.
- Various dependencies bumped.

## 0.14.0

- Replaced internal logger with [roosevelt-logger](https://github.com/rooseveltframework/roosevelt-logger). Note: this removes the `winston` Express variable that was previously provided, but it is still indirectly accessible by drilling down through the `logger` Express variable now. See [roosevelt-logger member variable documentation](https://github.com/rooseveltframework/roosevelt-logger#properties-of-roosevelt-logger-module).
- If custom routers are being used, the `res.redirect()` method will now prepend the prefix to redirects that are relative to the hostname. To override this setting pass `true` as the last argument.
- HTML validator `exceptions` param will now accept an array of values instead of just a single string value.
- Various dependencies bumped.
- CI improvements.

## 0.13.0

- Roosevelt will now warn you if your CSS/JS compile directory is getting stale and might need to be cleaned with `npm run clean`. A new `cleanTimer` param has been added to configure or disable this check.
- Added new param `routers` to add support for [Express Routers](https://expressjs.com/en/guide/routing.html#express-router).
- Added new feature to create custom CSS/JS preprocessors on the fly.
- Added environment variable to enable/disable the HTML validator autokiller.
- Added OpenJDK support to the Java HTML Validator.
- Various dependencies bumped.
- CI improvements.

## 0.12.2

- Introduced changelog.
- Autokiller now sends human-readable GET.
- Fixed bug which caused the config auditor to report false errors in the case of third party module params being set to configurations other than the default.
- Fixed bug related to HTTPS cert parsing.
- Disabled option in HTML minifier which removes HTML comments by default.
- Various dependencies bumped.
- CI improvements.

## 0.12.1 and below

[Here be dragons](https://en.wikipedia.org/wiki/Here_be_dragons)...
