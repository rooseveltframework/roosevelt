
Roosevelt MVC web framework
===

[![Build Status](https://travis-ci.org/rooseveltframework/roosevelt.svg?branch=master)](https://travis-ci.org/rooseveltframework/roosevelt) [![codecov](https://codecov.io/gh/rooseveltframework/roosevelt/branch/master/graph/badge.svg)](https://codecov.io/gh/rooseveltframework/roosevelt) [![npm](https://img.shields.io/npm/v/roosevelt.svg)](https://www.npmjs.com/package/roosevelt)

Roosevelt is a web application development framework based on [Express](http://expressjs.com) that aims to be the easiest web framework on the [Node.js](https://nodejs.org) stack to learn and use.

Some notable features:

- Minimal boilerplate to get started. Teddy Roosevelt—[the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time_p5.html)—curtailed the abuse of monopolists, so there's no way he would ever put up with all the indecipherable boilerplate common to other web frameworks.
- Default directory structure is simple, but easily configured.
- Concise default [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- Uses [Teddy](https://github.com/rooseveltframework/teddy) HTML templates by default which are much easier to read and maintain than popular alternatives. Can be configured to use any templating system that supports Express.
- [LESS](http://lesscss.org) and [UglifyJS](http://lisperator.net/uglifyjs/) preconfigured out of the box to intelligently minify your external facing CSS and JS files. Other preprocessors are supported via wrapper modules.
- Built-in, easy to use interface to [browserify](http://browserify.org) bundling for frontend JS modularization using the Node.js module `exports` and `require` syntax.
- Automatic HTML validation in development mode of your post-server rendered HTML using a local instance of the [Nu HTML Checker](https://www.npmjs.com/package/vnu-jar). <img src='http://i.imgur.com/s4YUHNG.png' alt='' title='All life begins with Nu and ends with Nu...' width='16' height='16' style='image-rendering: -moz-crisp-edges;image-rendering: -o-crisp-edges;image-rendering: -webkit-optimize-contrast;image-rendering: crisp-edges;-ms-interpolation-mode: nearest-neighbor;'>

![Teddy Roosevelt's facial hair is a curly brace.](https://github.com/rooseveltframework/generator-roosevelt/blob/master/generators/app/templates/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

*Note: this is documentation for Roosevelt 0.12.x. If you need API documentation for a previous version of Roosevelt, [look here](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt).*

Table of contents
===

- [Create and run a Roosevelt app](https://github.com/rooseveltframework/roosevelt#create-and-run-a-roosevelt-app)
  - [Using the Roosevelt app generator](https://github.com/rooseveltframework/roosevelt#using-the-roosevelt-app-generator)
  - [Create a Roosevelt app manually](https://github.com/rooseveltframework/roosevelt#create-a-roosevelt-app-manually)
  - [Available npm scripts](https://github.com/rooseveltframework/roosevelt#available-npm-scripts)
  - [Available command line arguments](https://github.com/rooseveltframework/roosevelt#available-command-line-arguments)
  - [Combining npm scripts and command line arguments](https://github.com/rooseveltframework/roosevelt#combining-npm-scripts-and-command-line-arguments)
  - [Recognized environment variables](https://github.com/rooseveltframework/roosevelt#recognized-environment-variables)
- [Default directory structure](https://github.com/rooseveltframework/roosevelt#default-directory-structure)
  - [Default .gitignore](https://github.com/rooseveltframework/roosevelt#default-gitignore)
- [Configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters)
  - [App behavior parameters](https://github.com/rooseveltframework/roosevelt#app-behavior-parameters)
  - [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters)
  - [Statics parameters](https://github.com/rooseveltframework/roosevelt#statics-parameters)
  - [Public folder parameters](https://github.com/rooseveltframework/roosevelt#public-folder-parameters)
  - [Events](https://github.com/rooseveltframework/roosevelt#events)
  - [Event list](https://github.com/rooseveltframework/roosevelt#event-list)
- [Making controller files](https://github.com/rooseveltframework/roosevelt#making-controller-files)
- [Making model files](https://github.com/rooseveltframework/roosevelt#making-model-files)
- [Making view files](https://github.com/rooseveltframework/roosevelt#making-view-files)
- [Express variables exposed by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-variables-exposed-by-roosevelt)
- [Express middleware and other configurations automatically loaded by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-middleware-and-other-configurations-automatically-loaded-by-roosevelt)
- [Documentation for previous versions of Roosevelt](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt)

Create and run a Roosevelt app
===

First you will need to install [Node.js](http://nodejs.org). Both the current and LTS version of Node.js are supported. It is recommended that you install using a Node.js version manager like [nvm](https://github.com/creationix/nvm) rather than the official installer, as a version manager will allow you to switch between multiple versions of Node.js easily.

Some important caveats to note:

- nvm is not available on Windows. Windows users should try out [nvm-windows](https://github.com/coreybutler/nvm-windows) or [nvs](https://github.com/jasongin/nvs).
- It is also recommended that Windows users use a terminal that supports emojis, such as [cmder](http://cmder.net/), at least until Microsoft [rolls out this planned update to cmd.exe](https://arstechnica.com/gadgets/2018/07/microsoft-is-making-the-windows-command-line-a-lot-better/).
- Linux/macOS users who install Node.js without a version manager like nvm may need to resolve some commonly encountered [permissions headaches associated with npm](https://docs.npmjs.com/getting-started/fixing-npm-permissions). As such, use of nvm is strongly recommended.

The [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) is also required for development work. The JDK is required for the local HTML validator feature.

Once you have a sane development environment, you can proceed with the standard install procedure below.


Using the Roosevelt app generator
---

The [Roosevelt app generator](https://github.com/rooseveltframework/generator-roosevelt) is a command line script based on [Yeoman](http://yeoman.io) that can create a sample Roosevelt app for you.

To use it, first globally install Yeoman and the Yeoman-based Roosevelt app generator:

```
npm i -g yo generator-roosevelt
```

Create a Roosevelt app using the Roosevelt app generator:

```
yo roosevelt
```

Then follow the prompts.

Afterward, `cd` to your app's directory and install dependencies:

```
npm i
```

Run in development mode:

```
npm run d
```

Or run in production mode:

```
npm run p
```

## Create a Roosevelt app manually

It is also possible to create a Roosevelt app without using the app generator. This will result in a more minimalist default configuration (e.g. no CSS or JS preprocessors enabled by default).

To do that:

- First create a new folder and `cd` into it.
- Then `npm i roosevelt`. This will create a `node_modules` folder with Roosevelt and its bare minimum dependencies.
- Create a file named `app.js`.
- Put this code in `app.js`:
  ```javascript
  require('roosevelt')({
    'generateFolderStructure': true
  }).startServer()
  ```
 - Then `node app.js`. If the `generateFolderStructure` param is set to true like the above code example, an entire Roosevelt app with bare minimum viability will be created and the server will be started. See below for more information about parameter configuration.

Available npm scripts
---

Roosevelt apps created with the app generator come with the following notable [npm scripts](https://docs.npmjs.com/misc/scripts) prepopulated in [package.json](https://docs.npmjs.com/files/package.json):

- `npm run production`: Runs the app in production mode.
  - Default shorthands:
    - `npm run prod`
    - `npm run p`
    - `npm start`
  - Script is short for: `node app.js --production-mode`
- `npm run development`: Runs the app in development mode.
  - Default shorthands:
    - `npm run dev`
    - `npm run d`
  - Script is short for: `node app.js --development-mode`
- `npm run kill-validator`: Finds the HTML validator process and kills it if it is running.
  - Default shorthand:
    - `npm run kv`
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/killValidator.js`

- `npm run clean`: Removes all build artifacts (symlinks and directories) auto-generated by Roosevelt. Will prompt to confirm before deleting any files.
  - Default shorthand:
    - `npm run c`
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/appCleanup.js`

- `npm run config-audit`: Scans current `rooseveltConfig` and `scripts` in `package.json` and warns about any params or npm scripts that don't match the current Roosevelt API:
  - Default shorthand:
    - `npm run a`
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/configAuditor.js`
  - Note: this will run automatically whenever you run `npm i` as well.

## Available command line arguments

- `node app.js --production-mode `: Runs the app in production mode.
  - Default shorthands:
    - `--prod`
    - `-p`
- `node app.js --development-mode `: Runs the app in development mode.
  - Default shorthands:
    - `--dev`
    - `-d`
- `node app.js --cores <m> `: Configures how many CPUs your app will run on.
  - `<m>` can be either a number representing the desired cores, or you can supply `max` to use all available CPUs.
    - Default is `1`.
  - Default shorthand:
    - `-c`
- `node app.js --enable-validator `: Forces the HTML validator to be enabled.
  - Default shorthands:
    - `--html-validator`
    - `-h`
- `node app.js --disable-validator `: Forces the HTML validator to be disabled.
  - Default shorthands:
    - `--raw`
    - `-r`
- `node app.js --background-validator `: Forces the HTML validator to run as a detached background process.
  - Default shorthand:
    - `-b`
- `node app.js --attach-validator `: Forces the HTML validator to run as an attached process.
  - Default shorthand:
    - `-a`
- `node app.js --host-public `: Forces Roosevelt to always host the [public folder](https://github.com/rooseveltframework/roosevelt#public-folder-parameters) even when `alwaysHostPublic` is set to false. Useful for testing production mode.
  - Default shorthands:
    - `--statics`
    - `-s`

## Combining npm scripts and command line arguments

The npm scripts can be combined with the command line flags.

For example, running `npm run d -- -r` will run your app in development mode and force the HTML validator to be disabled.

## Recognized environment variables

The following is a list of [environment variables](https://en.wikipedia.org/wiki/Environment_variable) that Roosevelt listens for.

- `NODE_ENV`:
  - Set to `production` to force the app into production mode.
  - Set to `development` to force the app into development mode.
- `NODE_PORT`: Default HTTP port to run your app on.
- `HTTP_PORT`: Default HTTP port to run your app on. Takes precedence over `NODE_PORT`.
- `HTTPS_PORT`: Default HTTPS port to run your app on.
- `ROOSEVELT_VALIDATOR`:
  - Set to `detached` to force the HTML validator to run as a detached background process.
  - Set to `attached` to force the HTML validator to run as an attached process.
- `ROOSEVELT_AUTOKILLER`:
  - Set to `on` to turn on the HTML validator autokiller on the separate process.
  - Set to `off`to turn off the HTML validator autokiller on the separate process.

Environment variable precedence:

- Environment variables supersede your app's [params](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters).

- Environment variables can be overridden with [command line arguments](https://github.com/rooseveltframework/roosevelt#available-command-line-arguments).

Default directory structure
===

- `app.js`: Entry point to your application. Feel free to rename this, but make sure to update `package.json`'s reference to it.
- `mvc`: Folder for models, views, and controllers. All configurable via params (see below).
  - `controllers`: Folder for controller files.
  - `models`: Folder for model files.
  - `views`: Folder for view files.
- `node_modules`: A standard folder where all modules your app depends on (such as Roosevelt) are installed to. This folder is created by the `npm i` command.
- `package.json`: A standard file in Node.js apps for configuring your app.
- `public`: All contents within this folder will be exposed as static files.
- `statics`: Folder for source CSS, image, JS, and other static files. By default some of the contents of this folder are symlinked to from public, which you can configure (see below).
  - `css`: Folder for source CSS files.
  - `images`: Folder for source image files.
  - `js`: Folder for source JS files.
- `.gitignore`: A standard file which contains a list of files and folders to ignore if your project is in a [git](https://git-scm.com/) repo.

Default .gitignore
---

The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before committing a fresh Roosevelt app to your git repo.

Some notable things ignored by default and why:

- `public`: It's recommended that you don't create files in this folder manually, but instead use the `staticsSymlinksToPublic` param detailed below to expose folders in your `statics` directory via auto-generated symlinks.
- `.build`: By default Roosevelt will compile LESS and JS files down to minified versions in `statics/.build` when the server starts. As such, it's not recommended to place files in the build directory manually.
- `node_modules`: This folder will be auto-generated when you run the `npm i` step to set up your app. Since some modules you might include later in your app can be platform-specific and are compiled for your OS during the install step, it's generally not recommended to commit the `node_modules` folder to git.

Configure your app with parameters
===

Roosevelt is designed to have a minimal amount of boilerplate so you can focus on just writing your app. All parameters are optional. As such, by default, all that's in app.js is this:

```js
require('roosevelt')().startServer();
```

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

Also, while it is recommended that you pass params to Roosevelt via `package.json` under `"rooseveltConfig"`, you can also pass params programmatically via Roosevelt's constructor like so:

```js
require('roosevelt')({
  paramName: 'paramValue',
  param2:    'value2',
  etc:       'etc'
}).startServer();
```

This is particularly useful for setting params that can't be defined in `package.json` such as event handlers (see below).

App behavior parameters
---

- `port`: The HTTP port your app will run on.

  - Default: *[Number]* `43711`.

- `enableCLIFlags`: Enables parsing of command line flags.

  - Default: *[Boolean]* `true`.

- `generateFolderStructure`: When enabled Roosevelt will generate user specified directories (e.g. MVC parameters and statics parameters).

  - Default: *[Boolean]* `true`.
    - Exception to default: When `package.json` is not present or `rooseveltConfig` is not present in `package.json`, this param will be automatically set to `false` by default. This is a defensive measure to minimize the risk of files and folders being created in scenarios when they are not wanted.
  - This param is useful in scenarios when you want to create a Roosevelt app entirely from nothing (without using [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt)). See [create a Roosevelt app manually](https://github.com/rooseveltframework/roosevelt#create-a-roosevelt-app-manually) for an example.

- `appDir`: Root directory of your application.

  -  Default: *[String]* The directory where your project `package.json` is located.

- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx. This setting is ignored in development mode.

  - Default: *[Boolean]* `true`.

- `logging`: Declare the types of logging to use in Roosevelt's logger:

  - `http`: *[Boolean]* Log HTTP requests to the console.

  - `appStatus`: *[Boolean]* Log app status to the console.

  - `warnings`: *[Boolean]* Log app warnings to the console.

  - `verbose`: *[Boolean]* Enable verbose (noisy) logging.

  - `disable`: *[Array]* Disable logging when any of the environment variables in this array are present.

      - Example: `'disable': ['LOADED_MOCHA_OPTS']`

  - Default: *[Object]*

      ```json
      {
        "http": true,
        "appStatus": true,
        "warnings": true,
        "verbose": false
      }
      ```

  - You can also declare a custom log types and classify them as logs, warnings, or errors:

      - Default `logging` param with custom log type called `debug` added to it: *[Object]*

        ```json
        {
          "http": true,
          "appStatus": true,
          "warnings": true,
          "verbose": false,
          "debug": {
            "enable": true,
            "type": "error"
          }
        }
        ```

      - `enable` param: Enables or disables the custom log.

        - Default: *[Boolean]* `true`.

      - `type` param: Specifies what kind of log your custom log is:

        - Allowed values: *[String]* `info`, `warn`, or `error`.

- `minify`: Enables HTML minification as well as the minification step in supporting CSS and JS compilers.

  - Default: *[Boolean]* `true`.
  - Note: Automatically disabled during development mode.

- `htmlValidator`: Params to send to [html-validator](https://github.com/zrrrzzt/html-validator#usage):

  - `enable`: *[Boolean]* Enables or disables the built-in HTML validator.

      - Note: The validator is only available in development mode.

  - `exceptions`: Sending a custom request header can disable the validator on a per request basis. The name of this request header and model value can be customized with this param.

      - Default: *[Object]*

          ```javascript
          "exceptions": {
            "requestHeader": "Partial",
            "modelValue": "_disableValidator"
          }
          ```

  - `port`: *[Number]* Port to spawn the validator process on.

  - `separateProcess`: *[Object]* How to run the validator:

    - `enable`: *[Boolean]* Run the validator as a detached background process.
    - `autoKiller`: *[Boolean]* Spawns a process to kill the validator if it is backgrounded and idle for more than a certain amount of time.
    - `autoKillerTimeout`: *[Number]* Time (in milliseconds) that the validator auto-killer process waits before it kills the backgrounded validator.

  - `showWarnings`: *[Boolean]* When set to true, shows HTML validation warnings in addition to errors.

  - Default: *[Object]*

      ```json
      {
        "enable": true,
        "separateProcess": {
          "enable": true,
          "autoKiller": true,
          "autoKillerTimeout": 360000
        },
        "port": 48888,
        "exceptions": {
          "requestHeader": "Partial",
          "modelValue": "_disableValidator"
        },
        "showWarnings": true
      }
      ```

- `multipart`: Settings to pass along to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing. Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the `uploadDir` when the request ends automatically. To keep any, be sure to move them before the request ends. To disable multipart forms entirely, set this param to false.

  - Default: *[Boolean]*
    ```json
    {
      "multiples": true
    }
    ```

- `toobusy`: Params to pass to the [node-toobusy](https://github.com/STRML/node-toobusy) module.
  - `maxLagPerRequest`: *[Number]* Maximum amount of time (in milliseconds) a given request is allowed to take before being interrupted with a [503 error](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors).
  - `lagCheckInterval`: *[Number]* Interval (in milliseconds) for checking event loop lag in milliseconds.
  - Default: *[Object]*

      ```json
      {
        "maxLagPerRequest": 70,
        "lagCheckInterval": 500,
      }
      ```

- `bodyParser`: Parameters to supply to [body-parser.json](https://github.com/expressjs/body-parser).

  - Default: *[Object]*

      ```json
      {
        "urlEncoded": {
          "extended": true
        },
        "json": {}
      }
      ```

- `checkDependencies`: Whether or not to warn if dependencies are out of date.

  - Default: *[Boolean]* `true`.

- `cores`: By default, Roosevelt will run on 1 CPU, but you can change the number of cores that the app will run on with this param.

  - Default: *[Number]* `1`.
  - To use all available cores, set this value to `max`.

- `shutdownTimeout`: Maximum amount of time in milliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.

  - Default: *[Number]* `30000` (30 seconds).

HTTPS parameters
---

- `https`: *[Object]* Run a HTTPS server using Roosevelt.
  - Object members:
  - `enable`: Enable a HTTPS server.
    - Default: *[Boolean]* `false`.
  - `force`: Disallow unencrypted HTTP and route all traffic through HTTPS.
    - Default: *[Boolean]* `false`.
  - `port`: The port your app will run a HTTPS server on.
    - Default: *[Number]* `43733`.
  - `authInfoPath`: *[Object]* Specify either the paths where the _server_ certificate files can be found or set the appropriate parameters to be a PKCS#12-formatted string or certificate or key strings.
    - Default: `undefined`
    - Object members:
    - `p12`: *[Object]* Parameter used when the _server_ certificate/key is in PKCS#12 format.
      - Object members:
      - `p12Path`:  *[String]* Either the path to a PKCS#12-formatted file (.p12/.pfx) _or_ a PKCS#12-formatted string or buffer (i.e. the result of fs.readFileSync(/path/to/file/example.p12))
        - Default: `undefined`
      - `passphrase`: *[String]* The password used to encrypt the PKCS#12-formatted file or string.
        - Default: `undefined`.
    - `authCertAndKey`: *[Object]* Parameter used when the _server_ certificate and key are in separate PEM-encoded files.
      - Object members:
      - `cert`: *[String]* Either the path to a PEM-encoded certificate file (.crt, .cer, etc.) or a PEM-encoded certificate string.
        - Default: `undefined`
      - `key`: *[String]* Either the path to a PEM-encoded key file (.crt, .cer, etc.) or a PEM-encoded key string for the certificate given in `cert`.
        - Default: `undefined`
  - `caCert`: *[String]* Either the path to a PEM-encoded Certificate Authority root certificate or certificate chain or a PEM-encoded Certificate Authority root certificate or certificate chain string. _This certificate (chain) will be used to verify **client** certificates presented to the server. It is only needed if `requestCert` and `rejectUnauthorized` are both set to `true` and the client certificates are **not** signed by a Certificate Authority in the default publicly trusted list of CAs [curated by Mozilla](https://hg.mozilla.org/mozilla-central/raw-file/tip/security/nss/lib/ckfw/builtins/certdata.txt)_.
    - Default: `undefined`.
  - `requestCert`: *[Boolean]* Set whether to request a certificate from the client attempting to connect to the server to verify the client's identity.
    - Default: `undefined`.
  - `rejectUnauthorized`: *[Boolean]* Set whether to reject connections from clients that do no present a valid certificate to the server. (Ignored if `requestCert` is set to `false`.)
    - Default:  `undefined`.
  - Default: *[Object]* `{}`.


MVC parameters
---

- `modelsPath`: Relative path on filesystem to where your model files are located.

  - Default: *[String]* `"mvc/models"`.

- `viewsPath`: Relative path on filesystem to where your view files are located.

  - Default: *[String]* `"mvc/views"`.

- `viewEngine`: What templating engine to use, formatted as `"fileExtension: nodeModule"`.
  - [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) default: *[String]* `"html: teddy"`.
  - Also by default when using the generator, the module [teddy](https://github.com/rooseveltframework/teddy) is marked as a dependency in `package.json`.
  - Bare Roosevelt default (when an app is created without the generator): *[String]* `none`. Can also be set to `null` to use no templating engine.
  - To use multiple templating systems, supply an array of engines to use in the same string format. Each engine you use must also be marked as a dependency in your app's `package.json`. Whichever engine you supply first with this parameter will be considered the default.
  - Example configuration using multiple templating systems: *[Object]*

      ```json
      {
        "viewEngine": [
          "html: teddy",
          "mustache: mustache",
          "handlebars: handlebars",
          "ejs: ejs"
        ]
      }
      ```

- `controllersPath`: Relative path on filesystem to where your controller files are located.

  - Default: *[String]* `"mvc/controllers"`.

- `errorPages`: Relative path on filesystem to where your various error page controller files are located. If you do not supply them, Roosevelt will use its default ones instead:

  - `notFound`: Your [404 Not Found](https://en.wikipedia.org/wiki/HTTP_404) error page.
    - Default: *[String]* `"404.js"`.
  - `internalServerError`: Your [Internal Server Error](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors) error page.
    - Default: *[String]* `"5xx.js"`.
  - `serviceUnavailable`: Your [503 Service Unavailable](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors) error page.
    - Default: *[String]* `"503.js"`.

Statics parameters
---

- `staticsRoot`: Relative path on filesystem to where your source static assets are located. By default this folder will not be made public, but is instead meant to store unprocessed or uncompressed source assets that will later be preprocessed and exposed in `public`.

  - Default: *[String]* `"statics"`.
- `htmlMinifier`: How you want Roosevelt to minify your HTML:

  - `enable`: *[Boolean]* Enable HTML minification.

      - Note: Minification is automatically disabled in development mode.

  - `exceptionRoutes`: *[Array]* List of controller routes that will skip minification entirely. Set to `false` to minify all URLs.
  - `options`: *[Object]* Params to supply to [html-minifier](https://github.com/kangax/html-minifier#options-quick-reference)'s API.
  - Default: *[Object]*

      ```json
      {
        "enable": true,
        "exceptionRoutes": false,
        "options": {
          "removeComments": true,
          "collapseWhitespace": true,
          "collapseBooleanAttributes": true,
          "removeAttributeQuotes": true,
          "removeEmptyAttributes": true
        }
      }
      ```

- `css`: *[Object]* How you want Roosevelt to configure your CSS preprocessor:

  - `sourcePath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and written to a build directory when the app is started.

  - `compiler`: *[Object]* Which Roosevelt CSS preprocessor middleware (if any) to use.

    - `nodeModule`: *[String]* Node module name of the Roosevelt CSS preprocessor middleware you wish to use.

      - Note: Your chosen Roosevelt CSS preprocessor module must also be marked as a dependency in your app's `package.json`.
    - `params`: *[Object]* Params to send to the Roosevelt CSS preprocessor middleware if it accepts any.

    - Note: The default preprocessor for a Roosevelt app created with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) is [roosevelt-less](https://github.com/rooseveltframework/roosevelt-less), which is marked as a dependency in `package.json` on freshly generated Roosevelt apps. See [roosevelt-less usage](https://github.com/rooseveltframework/roosevelt-less#usage) for details on what params are available.

        - The Roosevelt team also maintains [roosevelt-sass](https://github.com/rooseveltframework/roosevelt-sass), an alternative to roosevelt-less.

    - [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) default configuration: *[Object]*

        ```json
        {
          "nodeModule": "roosevelt-less",
          "params": {
            "cleanCSS": {
              "advanced": true,
              "aggressiveMerging": true
            },
            "sourceMap": null
          }
        }
        ```

    - Bare Roosevelt default (when an app is created without the generator): *[String]* `none`. Can also be set to `null` to use no CSS compiler.

  - `whitelist`: Array of CSS files to whitelist for compiling. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.

    - Example array member: *[String]* `less/example.less:.build/css/example.min.css` (compiles `less/example.less` into `.build/css/example.min.css`).

  - `output`: Where to write compiled CSS files to. This folder will be symlinked into `public` by default.

  - `symlinkToPublic`: *[Boolean]* When enabled Roosevelt will automatically add your CSS directory to the `staticsSymlinksToPublic` param.

    - Note: If the compiler is enabled `output` will be symlinked. If not,  `sourcePath` will be symlinked.

  - `versionFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable containing your app's version number from `package.json`. Enable this option by supplying an object with the member variables `fileName` and `varName`.

    - Default: `null`.
    - Example usage (with roosevelt-less): *[Object]*
        ```json
        {
          "fileName": "_version.less",
          "varName": "appVersion"
        }
        ```

    - Assuming the default Roosevelt configuration otherwise, this will result in a file `statics/css/_version.less` with the following content:

        ```less
        /* do not edit; generated automatically by Roosevelt */ @appVersion: '0.1.0';
        ```

    - Some things to note:
      - If there is already a file there with that name, this will overwrite it, so be careful!
      - It's generally a good idea to add this file to `.gitignore`, since it is a build artifact.

  - Default: *[Object]*

      ```json
      {
        "sourcePath": "css",
        "compiler": {
          "nodeModule": "roosevelt-less",
          "params": {
            "cleanCSS": {
              "advanced": true,
              "aggressiveMerging": true
            },
            "sourceMap": null
          }
        },
        "whitelist": null,
        "output": ".build/css",
        "symlinkToPublic": true,
        "versionFile": null
      }
      ```

- `js`: *[Object]* How you want Roosevelt to configure your JS compiled:

  - `sourcePath`: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unminified JS source files which will be minified and written to a build directory when the app is started.

  - `compiler`: Which Roosevelt JS minifier middleware (if any) to use.

    - `nodeModule`: *[String]* Node module name of the Roosevelt JS minifier middleware you wish to use.

      - Note: Your chosen Roosevelt JS minifier module must also be marked as a dependency in your app's `package.json`.

    - `showWarnings`: *[Boolean]* Set to true to display compiler module warnings.

    - `params`: *[Object]* Params to send to the Roosevelt JS minifier middleware if it accepts any.

    - Note: The default minifier for a Roosevelt app created with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) is [roosevelt-uglify](https://github.com/rooseveltframework/roosevelt-uglify), which is marked as a dependency in `package.json` on freshly generated Roosevelt apps. See [roosevelt-uglify usage](https://github.com/rooseveltframework/roosevelt-uglify#usage) for details on what params are available.

      - The Roosevelt team also maintains [roosevelt-closure](https://github.com/rooseveltframework/roosevelt-closure), an alternative to roosevelt-uglify.

    - [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) default configuration: *[Object]*

        ```json
        {
          "nodeModule": "roosevelt-uglify",
          "showWarnings": false,
          "params": {}
        }
        ```

    - Bare Roosevelt default (when an app is created without the generator): *[String]* `none`. Can also be set to `null` to use no JS minifier.

  - `whitelist`: Array of JS files to whitelist for minification. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.

    - Default: `null` (compiles all JS files, if a JS minifier is enabled).
    - Example array member: *[String]* `library-name/example.js:lib/example.min.js` (compiles `library-name/example.js` into `lib/example.min.js`).

  - `blacklist`: Array of JS files to exempt from minification. These files will be copied as-is to the build folder. Leave undefined to compile all files.
    - Default: `null` (compiles all JS files, if a JS minifier is enabled).
    - Example: *[String]* `example.js`.

  - `output`: Where to write compiled JS files to. This folder will be symlinked into `public` by default.

    - Default: *[String]* `".build/js"`.

  - `symlinkToPublic`: *[Boolean]* When enabled Roosevelt will automatically add your JS directory to the `staticsSymlinksToPublic` param.

    - Note: If the compiler is enabled `output` will be symlinked. If not,  `sourcePath` will be symlinked.

  - `bundler`: Params related to bundling JS with [browserify](http://browserify.org):

    - Note: Use of browserify in Roosevelt is optional. If no bundles are defined here, the browserify step will be skipped.

    - `bundles`: *[Array]* Declare one or more source JS files in your `sourcePath` to be browserify bundles via its [bundle method](https://github.com/substack/node-browserify#browserifyfiles--opts).

      - `env`: *[String]* Bundle only in `dev` or `prod` mode. Omitting `env` will result in bundling in both modes.
      - `params`: *[Object]* The [browserify params](https://github.com/browserify/browserify#methods) to send to browserify. If it is not set, these default params will be sent: `{"paths": <your jsPath>}`.
      - Examples: *[Array]* of *[Objects]*
          - Browserify bundle example declaring one bundle:

              ```
              [
                {
                  "outputFile": "bundle.js",
                  "files": [
                    "landingPage.js",
                    "main.js",
                    "etc.js"
                  ],
                  "params": {
                    "someOpt":
                    "someValue"
                  }
                }
              ]
              ```

          - Browserify bundle example declaring one bundle only used in `dev` mode:

              ```
              [
                {
                  "outputFile": "bundle.js",
                  "env": "dev",
                  "files": [
                    "landingPage.js",
                    "main.js",
                    "etc.js"
                  ],
                  "params": {
                    "someOpt": "someValue"
                  }
                }
              ]
              ```

          - Browserify bundle example declaring multiple bundles:

              ```
              [
                {
                  "outputFile": "bundle1.js",
                  "files": [
                    "landingPage.js",
                    "main.js",
                    "etc.js"
                  ],
                  "params": {
                    "someOpt": "someValue"
                  }
                },
                {
                  "outputFile": "bundle2.js",
                  "files": [
                    "somethingElse.js",
                    "anotherThing.js",
                    "etc.js"
                  ]
                },
                etc...
              ]
              ```
      - Default: *[Array]* `[]`.

    - `output`: Subdirectory within `sourcePath` where you would like [browserify](http://browserify.org) to deposit bundled JS files it produces.

      - Default: *[String]* `".bundled"`.

    - `expose`: Whether or not to copy the `output` directory to your build directory.

      - Default: *[Boolean]* `true`.

  - Default: *[Object]*

      ```json
      {
        "sourcePath": "js",
        "compiler": {
          "nodeModule": "roosevelt-uglify",
          "showWarnings": false,
          "params": {}
        },
        "whitelist": null,
        "blacklist": null,
        "output": ".build/js",
        "symlinkToPublic": true,
        "bundler": {
          "bundles": [],
          "output": ".bundled",
          "expose": true
        }
      }
      ```

Public folder parameters
---

- `publicFolder`: All files and folders in this directory will be exposed as static files.

  -  Default: *[String]* `"public"`.
- `favicon`: Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.

  - [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt) default: *[String]* `"images/favicon.ico"`.
  - Bare Roosevelt default (when an app is created without the generator): *[String]* `none`. Can also be set to `null` to use no favicon.
- `staticsSymlinksToPublic`: Array of folders from `staticsRoot` to make symlinks to in your public folder, formatted as either `"linkName: linkTarget"` (whitespace optional) or simply `"linkName"` if the link target has the same name as the desired link name.

  - Default: *[Array]* of *[Strings]*
      ```json
      [
        "css: .build/css",
        "images",
        "js: .build/js"
      ]
      ```

- `versionedPublic`: If set to true, Roosevelt will prepend your app's version number from `package.json` to your public folder. Versioning your public folder is useful for resetting your users' browser cache when you release a new version.

  - Default: *[Boolean]* `false`.
- `alwaysHostPublic`:  By default in production mode Roosevelt will not expose the public folder. It's recommended instead that you host the public folder yourself directly through another web server, such as Apache or nginx. However, if you wish to override this behavior and have Roosevelt host your public folder even in production mode, then set this setting to true.

  - Default: *[Boolean]* `false`.

Events
---

Roosevelt provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
require('roosevelt')({
  onServerStart: (app) => { /* do something */ }
});
```


Event list
---

- `onServerInit(app)`: Fired when the server begins starting, prior to any actions taken by Roosevelt.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onServerStart(app)`: Fired when the server starts.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onReqStart(req, res, next)`: Fired at the beginning of each new request.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.
  - `next`: Callback to continue with the request. Must be called to continue the request.
- `onReqBeforeRoute(req, res, next)`: Fired just before executing the controller.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.
  - `next`: Callback to continue with the request. Must be called to continue the request.
- `onReqAfterRoute(req, res)`: Fired after the request ends.
  - `req`: The [request object](http://expressjs.com/api.html#req.params) created by Express.
  - `res`: The [response object](http://expressjs.com/api.html#res.status) created by Express.

Making controller files
===

Controller files are just [standard Express routes](http://expressjs.com/api.html#app.VERB). A route is the term Express uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`.

To make a new controller, just make a new file in the controllers directory. For example:

```js
module.exports = (app) => { // app is the Express app created by Roosevelt

  // standard Express route
  app.route('/about').get((req, res) => {

    // load a data model
    let model = require('models/dataModel');

    // render a Teddy template and pass it the model
    res.render('about', model);
  });
};
```

Sometimes it is also useful to separate controller logic from your routing. This can be done by creating a reusable controller module.

An example would be creating a reusable controller for "404 Not Found" pages:

```js
// reusable controller "notFound.js"
module.exports = (app, req, res) => {
  let model = { content: 'Cannot find this page' };
  res.status(404);
  res.render('404', model);
}
```

Reusable controller modules differ from standard controller modules in that they accept `req` and `res` arguments in addition to `app`. They are meant to be called from within routes rather than define new routes.

This allows them to be called at will in any other controller's route when needed:

```js
// import the "notFound" controller logic previously defined
const throw404 = require('controllers/notFound');

module.exports = (app) => {
  app.route('/whatever').get((req, res) => {

    // test some logic that could fail
    // thus triggering the need for the 404 controller
    if (something) {

      // logic didn't fail
      // so just render the page normally
      let model = require('models/dataModel');
      res.render('whatever', model);
    }
    else {

      // logic failed
      // so throw the 404 by executing your reusable controller
      throw404(app, req, res);
    }
  });
};
```

Making model files
===

Since the above example requires a model file named `dataModel`, you will need to make that too. To do that, place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
module.exports = {some: 'data'};
```


Making view files
===

Views by default are [Teddy](https://github.com/rooseveltframework/teddy) templates. See the Teddy documentation for information about how to author Teddy templates.

You can also use different templating engines by tweaking Roosevelt's [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters).


Express variables exposed by Roosevelt
===

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.


| Express variable                     | Description                                                  |
| ------------------------------------ | ------------------------------------------------------------ |
| `express`                            | The Express module.                                          |
| *viewEngine* e.g. `teddy` by default | Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module. |
| `formidable`                         | The [formidable](https://github.com/felixge/node-formidable) module. Used for handling multipart forms. |
| `morgan`                             | The [morgan](https://github.com/expressjs/morgan) module. HTTP request logger middleware. |
| `winston`                            | The [winston](https://github.com/winstonjs/winston) logger module for custom logging. |
| `appName`                            | The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied. |
| `appVersion`                         | The version number of your app derived from `package.json`.  |
| `appDir`                             | The directory the main module is in.                         |
| `package`                            | The contents of `package.json`.                              |
| `staticsRoot`                        | Full path on the file system to where your app's statics folder is located. |
| `publicFolder`                       | Full path on the file system to where your app's public folder is located. |
| `cssPath`                            | Full path on the file system to where your app's CSS source files are located. |
| `jsPath`                             | Full path on the file system to where your app's JS source files are located. |
| `cssCompiledOutput`                  | Full path on the file system to where your app's minified CSS files are located. |
| `jsCompiledOutput`                   | Full path on the file system to where your app's minified JS files are located. |
| `jsBundledOutput`                    | Full path on the file system to where your app's bundled JS files are located. |
| `modelsPath`                         | Full path on the file system to where your app's models folder is located. |
| `viewsPath`                          | Full path on the file system to where your app's views folder is located. |
| `controllersPath`                    | Full path on the file system to where your app's controllers folder is located. |
| `params`                             | The params you sent to Roosevelt.                            |
| `flags`                              | Command line flags sent to Roosevelt.                        |
| `logger`                             | The logging module used for simple parameterized logging.    |

Additionally the Roosevelt constructor returns the following object:

| Roosevelt object members | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `expressApp`             | *[Object]* The [Express app](http://expressjs.com/api.html#express) created by Roosevelt. |
| `httpServer`             | *[Object]* The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. `httpServer` is also available as a direct child of `app`, e.g. `app.httpServer`. |
| `httpsServer`            | *[Object]* The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt. `httpsServer` is also available as a direct child of `app`, e.g. `app.httpsServer`. |
| `initServer`             | *[Method]* Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. |
| `startServer`            | *[Method]* Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config. |
| `stopServer`             | *[Method]* Stops the server and takes an optional argument `stopServer('close')` which stops the server from accepting new connections before exiting. |


Express middleware and other configurations automatically loaded by Roosevelt
===

In addition to exposing a number of variables to Express and providing the MVC interface outlined above, Roosevelt also:

- Includes the [compression](https://github.com/expressjs/compression) middleware.
- Includes the [cookie-parser](https://github.com/expressjs/cookie-parser) middleware.
- Disables `x-powered-by` and `etag`.
- Logs HTTP requests to the console using [morgan](https://github.com/expressjs/morgan), specifically `morgan('combined')`.
- Includes the [method-override](https://github.com/expressjs/method-override) middleware.

# Documentation for previous versions of Roosevelt

- *[0.11.x](https://github.com/rooseveltframework/roosevelt/blob/df3f4f60a08215fcbae7b5c9765623bb46c2cd2c/README.md)*
- *[0.10.x](https://github.com/rooseveltframework/roosevelt/blob/fac53c2c8d6fedd74f4c3ef85c481dba250dee00/README.md)*
- *[0.9.x](https://github.com/rooseveltframework/roosevelt/blob/15031010974475f7baf2355b9e06a977675db269/README.md)*
- *[0.8.x](https://github.com/rooseveltframework/roosevelt/blob/a99c44edc022fee3c0e49b8f0f81d41f8957db27/README.md)*
- *[0.7.x](https://github.com/rooseveltframework/roosevelt/blob/b57533979d2962b524d217d125f3abafb7b5a94c/README.md)*
- *[0.6.x](https://github.com/rooseveltframework/roosevelt/blob/44bd29c2739785c7a1a4396287d49e8d9733af2b/README.md)*
- Older… [here be dragons](https://en.wikipedia.org/wiki/Here_be_dragons).
