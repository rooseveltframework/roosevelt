# Roosevelt Changelog

## Next version

- Replace browserify with webpack.
- Eliminated concept of separate JS compilers in favor of webpack.
- Eliminated concept of css preprocessor middleware modules in favor of built-in support for less, sass, and stylus.
- API changes:
  - Removed `symlinkToPublic`, `compiler`, `output`, `whitelist`, and `blacklist` params from `js`.
  - Replaced `js.bundles` with `js.webpack`.
  - Removed `css.symlinkToPublic`.
  - Replaced `css.compiler.params.CleanCSS` with `css.minifier`.
  - Added `css.compiler.enable`.
  - Replaced `css.compiler.nodeModule` with `css.compiler.module`.
  - Replaced `css.compiler.params` with `css.compiler.options`.
  - `css.output` is now relative to `publicFolder` instead of `staticsRoot`.
  - `clientViews.output` is now relative to `publicFolder` instead of `staticsRoot`.
  - Removed `cleanTimer` (Obsolete in absense of .build).
- Source-configs integration is now more tightly knit.
- Config auditor no longer complains about missing params.
- Auditor now checks config params on a case-by-case basis.
- ES6 style variables can now be used in roosevelt config.
- Introduced views bundler: An API that allows you to expose view code to frontend JS for client-side templating.
- Added a button to the validation error page to display the page anyway and another button to disable the validator entirely until the server restarts.
- Fixed bug with frontend reload causing it to inject the script tag in the wrong location in some situations.
- Fixed bug where router would cause app routes to fail when no controller files exist.
- Fixed bug where auto build scanner would crash the app when generateFolderStructure is false.
- Fixed bug which resulted in a cryptic error if a Roosevelt app was moved to another directory.
- Fixed bug where symlink failed errors would appear when generateFolderStructure is false.
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
