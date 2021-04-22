# Roosevelt Changelog

## Next version

- Put your changes here...

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

- You can now [use PHP as your templating engine](https://github.com/rooseveltframework/express-php-view-engine) in a Roosevelt app or any other Express application. PHP should be faster than any JS-based templating engine for complex templates since its parser is written in C rather than JS.
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
