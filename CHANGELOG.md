# Roosevelt Changelog

## Next version

- Put your changes here...

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
