
# Roosevelt MVC web framework

[![Build Status](https://github.com/rooseveltframework/roosevelt/workflows/CI/badge.svg
)](https://github.com/rooseveltframework/roosevelt/actions?query=workflow%3ACI) [![codecov](https://codecov.io/gh/rooseveltframework/roosevelt/branch/master/graph/badge.svg)](https://codecov.io/gh/rooseveltframework/roosevelt) [![npm](https://img.shields.io/npm/v/roosevelt.svg)](https://www.npmjs.com/package/roosevelt)

Roosevelt is a web application development framework based on [Express](http://expressjs.com) that aims to be the easiest web framework on the [Node.js](https://nodejs.org) stack to learn and use.

Some notable features:

- Minimal boilerplate to get started. Teddy Roosevelt—referred to by Cracked magazine as the "[the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time_p5.html)"—curtailed the abuse of monopolists, so there's no way he would ever put up with all the indecipherable boilerplate common to other web frameworks.
- Default directory structure is simple, but easily configured.
- Concise default [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.
- Uses [Teddy](https://github.com/rooseveltframework/teddy) HTML templates by default which are much easier to read and maintain than popular alternatives. Can be configured to use any templating system that supports Express.
  - Need some extra speed in template parsing? Consider writing your templates in [PHP](https://php.net)! The Roosevelt team also built a view engine that lets you [use PHP as your templating engine](https://github.com/rooseveltframework/express-php-view-engine) in a Roosevelt app or any other Express application. PHP should be faster than any JS-based templating engine for complex templates since its parser is written in C rather than JS.
- [LESS](http://lesscss.org) preconfigured out of the box to intelligently minify your external-facing CSS files via [clean-css](https://www.npmjs.com/package/clean-css). There's also built-in support for [Sass](https://sass-lang.com) and [Stylus](https://stylus-lang.com). Other CSS preprocessors can be used as well with a bit of extra configuration.
- Built-in, easy to use interface for creating [Webpack](https://webpack.js.org/) bundles for module bundling and minifying your frontend JS.
- Optional isomorphic (aka universal, [amphibious](https://twitter.com/kethinov/status/566896168324825088), etc) controller support based on [page-express-mapper](https://github.com/rooseveltframework/page-express-mapper) to map [page.js](http://visionmedia.github.io/page.js/) to the Express API so both your Express routes and template code can be shared on the client and the server without modification for building single page apps with maximal code reuse on both sides.
- Automatic server reloading when your backend code changes (via [nodemon](https://nodemon.io)) and automatic browser reloading when your frontend code changes (via [reload](https://github.com/alallier/reload)).
- Automatic HTML validation in development mode of your post-server rendered HTML powered by [express-html-validator](https://github.com/rooseveltframework/express-html-validator).

![Teddy Roosevelt's facial hair is a curly brace.](https://github.com/rooseveltframework/generator-roosevelt/blob/master/generators/app/templates/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

*Note: this is documentation for the current version of Roosevelt. If you need API documentation for a previous version of Roosevelt, [look here](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt).*

# Table of contents

- [Create and run a Roosevelt app](https://github.com/rooseveltframework/roosevelt#create-and-run-a-roosevelt-app)
  - [Using the Roosevelt app generator](https://github.com/rooseveltframework/roosevelt#using-the-roosevelt-app-generator)
  - [Create a Roosevelt app manually](https://github.com/rooseveltframework/roosevelt#create-a-roosevelt-app-manually)
  - [Available npm scripts](https://github.com/rooseveltframework/roosevelt#available-npm-scripts)
  - [Available command line arguments](https://github.com/rooseveltframework/roosevelt#available-command-line-arguments)
  - [Combining npm scripts and command line arguments](https://github.com/rooseveltframework/roosevelt#combining-npm-scripts-and-command-line-arguments)
  - [Recognized environment variables](https://github.com/rooseveltframework/roosevelt#recognized-environment-variables)
  - [Overriding recognized command line flags and environment variables](https://github.com/rooseveltframework/roosevelt#overriding-recognized-command-line-flags-and-environment-variables)
- [Default directory structure](https://github.com/rooseveltframework/roosevelt#default-directory-structure)
  - [Default .gitignore](https://github.com/rooseveltframework/roosevelt#default-gitignore)
- [Configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters)
  - [App behavior parameters](https://github.com/rooseveltframework/roosevelt#app-behavior-parameters)
  - [HTTPS parameters](https://github.com/rooseveltframework/roosevelt#https-parameters)
  - [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters)
  - [Statics parameters](https://github.com/rooseveltframework/roosevelt#statics-parameters)
  - [Public folder parameters](https://github.com/rooseveltframework/roosevelt#public-folder-parameters)
  - [Events](https://github.com/rooseveltframework/roosevelt#events)
  - [Event list](https://github.com/rooseveltframework/roosevelt#event-list)
- [Making controller files](https://github.com/rooseveltframework/roosevelt#making-controller-files)
  - [Making isomorphic controller files](https://github.com/rooseveltframework/roosevelt#making-isomorphic-controller-files)
    - [roosevelt-router](https://github.com/rooseveltframework/roosevelt#roosevelt-router)
      - [API](https://github.com/rooseveltframework/roosevelt#api)
- [Making model files](https://github.com/rooseveltframework/roosevelt#making-model-files)
- [Making view files](https://github.com/rooseveltframework/roosevelt#making-view-files)
- [Express variables exposed by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-variables-exposed-by-roosevelt)
- [Express middleware and other configurations automatically loaded by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-middleware-and-other-configurations-automatically-loaded-by-roosevelt)
- [Supplying your own CSS and JS preprocessor](https://github.com/rooseveltframework/roosevelt#authoring-your-own-css-and-js-preprocessor)
- [Documentation for previous versions of Roosevelt](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt)

# Create and run a Roosevelt app

First you will need to install [Node.js](http://nodejs.org). Both the current and LTS version of Node.js are supported. It is recommended that you install using a Node.js version manager like [nvm](https://github.com/creationix/nvm) rather than the official installer, as a version manager will allow you to switch between multiple versions of Node.js easily.

Some important caveats to note:

- nvm is not available on Windows. Windows users should try out [recommended alternatives](https://github.com/nvm-sh/nvm#important-notes).
- It is also recommended that Windows users use a terminal that supports emojis, such as [Microsoft's new terminal](https://github.com/Microsoft/Terminal).
- Linux/macOS users who install Node.js without a version manager like nvm may need to resolve some commonly encountered [permissions headaches associated with npm](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally). As such, use of nvm is strongly recommended.

Once you have a sane development environment, you can proceed with the standard install procedure below.

## Using the Roosevelt app generator

The [Roosevelt app generator](https://github.com/rooseveltframework/generator-roosevelt) is a command line script based on [Yeoman](http://yeoman.io) that can create a sample Roosevelt app for you.

To use it, simply run the following command:

```bash
npx mkroosevelt
```

Then follow the prompts.

You can also optionally install the app generator to your system if you like so that it doesn't need to be refetched from npm each time you want to create a new app. To do that, first globally install Yeoman and the Yeoman-based Roosevelt app generator:

```bash
npm i -g yo generator-roosevelt
```

Then create a Roosevelt app using the Roosevelt app generator:

```bash
yo roosevelt
```

Then follow the prompts.

After creating your app, `cd` to your app's directory and install dependencies:

```bash
npm i
```

Run in development mode:

```bash
npm run d
```

Or run in production mode:

```bash
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

- Then `node app.js`. If the `generateFolderStructure` parameter is set to true like the above code example, an entire Roosevelt app with bare minimum viability will be created and the server will be started. See below for more information about parameter configuration.

## Available npm scripts

Roosevelt apps created with the app generator come with the following notable [npm scripts](https://docs.npmjs.com/misc/scripts) prepopulated in [package.json](https://docs.npmjs.com/files/package.json):

- `npm run production`: Runs the app in production mode.
  - Default shorthands:
    - `npm run prod`
    - `npm run p`
    - `npm start`
  - Script is short for: `nodemon app.js --production-mode`
- `npm run development`: Runs the app in development mode.
  - Default shorthands:
    - `npm run dev`
    - `npm run d`
  - Script is short for: `nodemon app.js --development-mode`
- `npm run production-proxy`: Runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only listens to requests coming from localhost and does not serve anything in the public folder. This mode is useful when you want to host your app behind a reverse proxy from a web server like Apache or nginx and [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).
  - Default shorthands:
    - `npm run prodproxy`
    - `npm run x`
  - Script is short for: `nodemon app.js --production-proxy`
- `npm run config-audit`: Scans current `rooseveltConfig` and `scripts` in `package.json` and warns about any parameters or npm scripts that don't match the current Roosevelt API:
  - Default shorthand:
    - `npm run a`
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/configAuditor.js`
  - Note: this will run automatically whenever you run `npm i` as well.

## Available command line arguments

- `node app.js --production-mode`: Runs the app in production mode.
  - Default shorthands:
    - `--prod`
    - `-p`
- `node app.js --development-mode`: Runs the app in development mode.
  - Default shorthands:
    - `--dev`
    - `-d`
- `node app.js --production-proxy-mode`: Runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only listens to requests coming from localhost and does not serve anything in the public folder. This mode is useful when you want to host your app behind a reverse proxy from a web server like Apache or nginx and [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).
  - Default shorthands:
    - `--prodproxy`
    - `-x`
- `node app.js --cores <m>`: Configures how many CPUs your app will run on.
  - `<m>` can be either a number representing the desired cores, or you can supply `max` to use all available CPUs.
    - Default is `1`.
  - Default shorthand:
    - `-c`
- `node app.js --enable-validator`: Forces the HTML validator to be enabled.
  - Default shorthands:
    - `--html-validator`
    - `-h`
- `node app.js --disable-validator`: Forces the HTML validator to be disabled.
  - Default shorthands:
    - `--raw`
    - `-r`

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

Environment variable precedence:

- Environment variables supersede your app's [parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters).
- Environment variables can be overridden with [command line arguments](https://github.com/rooseveltframework/roosevelt#available-command-line-arguments).

## Overriding recognized command line flags and environment variables

You can override the default command line flags and environment variables by providing a schema from [source-configs](https://github.com/rooseveltframework/source-configs) with a 'rooseveltConfig' section. For instance, to set the number of cores from the command line with '--num-cores' or '-n' instead of '--cores' or '-c', you could write:
```javascript
const schema = {
  rooseveltConfig: {
    cores: {
      commandLineArg: ['--num-cores', '-n'],
      envVar: ['NUM_CORES']
    }
  }
}
require('roosevelt')({
  'generateFolderStructure': true
}, schema).startServer()
```

Note that this also adds an environment variable.

This will override the default for any recognized Roosevelt parameter.

# Default directory structure

- `app.js`: Entry point to your application. Feel free to rename this, but make sure to update `package.json`'s reference to it.
- `mvc`: Folder for models, views, and controllers. All configurable via parameters (see below).
  - `controllers`: Folder for controller files.
  - `models`: Folder for model files.
  - `views`: Folder for view files.
- `node_modules`: A standard folder created by Node.js where all modules your app depends on (such as Roosevelt) are installed to. This folder is created when installing dependencies using the `npm i` command.
- `package.json`: A file common to most Node.js apps for configuring your app.
- `public`: All contents within this folder will be exposed as static files.
- `statics`: Folder for source CSS, image, JS, and other static files. By default some of the contents of this folder are symlinked to from `public`, which you can configure (see below).
  - `css`: Folder for source CSS files.
  - `images`: Folder for source image files.
  - `js`: Folder for source JS files.
- `.gitignore`: A standard file which contains a list of files and folders to ignore if your project is in a [git](https://git-scm.com/) repo. Delete it if you're not using git.

## Default .gitignore

The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before committing a fresh Roosevelt app to your git repo.

Some notable things ignored by default and why:

- `public`: It's recommended that you don't create files in this folder manually, but instead use the `statics` parameter detailed below to expose folders in your `statics` directory to `public` via auto-generated symlinks.
- `node_modules`: This folder is created when installing dependencies using the `npm i` step to set up your app. Since some modules you might include later in your app can be platform-specific and are compiled for your OS during the install step, it's generally not recommended to commit the `node_modules` folder to git.

# Configure your app with parameters

Roosevelt is designed to have a minimal amount of boilerplate so you can spend less time focused on configuration and more time writing your app. All parameters are optional. As such, by default, all that's in app.js is this:

```js
require('roosevelt')().startServer()
```

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

There are multiple ways to pass a configuration to Roosevelt:

- A `rooseveltConfig.json` file located in the root directory of your app.
- Via package.json under `"rooseveltConfig"`.
- Programmatically via Roosevelt's constructor like so:

  ```js
  require('roosevelt')({
    paramName: 'paramValue',
    param2:    'value2',
    etc:       'etc'
  }).startServer();
  ```

  - This is particularly useful for setting parameters that can't be defined in `package.json` or `rooseveltConfig.json` such as [event handlers](https://github.com/rooseveltframework/roosevelt#events).

In addition, all parameters support [template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) style variable syntax that you can use to refer to other Roosevelt parameters. For example:

```json
{
  "port": 4000,
  "https": {
    "port": "${port + 1}"
  },
  "css": {
    "sourcePath": "css",
    "output": ".build/${css.sourcePath}"
  }
}
```

Resolves to:

```json
{
  "port": 4000,
  "https": {
    "port": 4001
  },
  "css": {
    "sourcePath": "css",
    "output": ".build/css"
  }
}
```

## App behavior parameters

- `port`: The HTTP port your app will run on.

  - Default: *[Number]* `43711`.

- `mode`: Decides whether your app starts in production mode or development mode by default.

  - Default: *[String]* `production`.

- `enableCLIFlags`: Enables parsing of command line flags. Disable this if you want to handle `argv` yourself or if you don't want Roosevelt to listen to the command line flags it listens for by default.

  - Default: *[Boolean]* `true`.

- `generateFolderStructure`: When enabled Roosevelt will generate user specified directories (e.g. MVC parameters and statics parameters).

  - Default: *[Boolean]* `false`.

    - Will be set to `true` in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).

  - This parameter is useful in scenarios when you want to create a Roosevelt app entirely from nothing (without using [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt)). See [create a Roosevelt app manually](https://github.com/rooseveltframework/roosevelt#create-a-roosevelt-app-manually) for an example.

- `appDir`: Root directory of your application.

  - Default: *[String]* The directory where your app's `package.json` is located.

- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx.

  - Default: *[Boolean]* `true`.
  - Note: This setting is ignored in development mode.

- `logging`: Parameters to pass to [roosevelt-logger](https://github.com/rooseveltframework/roosevelt-logger). See [roosevelt-logger parameters documentation](https://github.com/rooseveltframework/roosevelt-logger#configure-logger) for configuration options.

  - Default: *[Object]*

      ```json
      {
        "methods": {
          "http": true,
          "info": true,
          "warn": true,
          "error": true,
          "verbose": false
        }
      }
      ```

- `minify`: Enables HTML and CSS minification.

  - Default: *[Boolean]* `true`.

  - Note: Automatically disabled during development mode.

- `htmlValidator`: Parameters to send to [express-html-validator](https://github.com/rooseveltframework/express-html-validator#configuration):

  - `enable`: *[Boolean]* Enables or disables the built-in HTML validator.

    - Note: The validator is only available in development mode.

  - `exceptions`: A set of params that can be used to prevent validation in certain scenarios:

    - `header` *[String]*: A custom header that when set will disable the validator on a per request basis.

      - Default: `'Partial'`.

    - `modelValue` *[String]*: An entry in your data model passed along with a `res.render` that when set will disable validation on the rendered HTML.

      - Default: `'_disableValidator'`.

  - `validatorConfig` *[Object]*: [html-validate configuration](https://html-validate.org/usage/#configuration) that determines what errors the validator looks for.

    - Note: The full list of available validator rules can be found [here](https://html-validate.org/rules/).

    - Note: This configuration can also be set by a `.htmlValidate.json` file placed in your app root directory.

  - Default: *[Object]*

    ```json
    {
      "enable": true,
      "exceptions": {
        "requestHeader": "Partial",
        "modelValue": "_disableValidator"
      },
      "validatorConfig": {}
    }
    ```

- `bodyParser`: Parameters to supply to the [body-parser](https://github.com/expressjs/body-parser) module.

  - `urlEncoded`: *[Object]* Parameters to supply to [body-parser.urlencoded](https://github.com/expressjs/body-parser#bodyparserurlencodedoptions).

  - `json`: *[Object]* Parameters to supply to [body-parser.json](https://github.com/expressjs/body-parser#bodyparserjsonoptions).

  - Default: *[Object]*

      ```json
      {
        "urlEncoded": {
          "extended": true
        },
        "json": {}
      }
      ```

- `formidable`: Parameters to pass to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing. Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the upload directory when the request ends automatically. To keep any, be sure to move them before the request ends.

  - Default: *[Object]*

    ```json
    {
      "multiples": true
    }
    ```

  - To disable multipart forms entirely, set `formidable` to `false`.

- `helmet`: Parameters to pass to the [helmet](https://github.com/helmetjs/helmet) module.
  - Default: *[Object]*
    The default options are specified in the [helmet docs](https://helmetjs.github.io/), with the exception of the upgrade-insecure-requests in the content security policy, which has been removed.

- `toobusy`: Parameters to pass to the [node-toobusy](https://github.com/STRML/node-toobusy) module.

  - `maxLagPerRequest`: *[Number]* Maximum amount of time (in milliseconds) a given request is allowed to take before being interrupted with a [503 error](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors).

  - `lagCheckInterval`: *[Number]* Interval (in milliseconds) for checking event loop lag in milliseconds.

  - Default: *[Object]*

    ```json
    {
      "maxLagPerRequest": 70,
      "lagCheckInterval": 500
    }
    ```

- `checkDependencies`: Whether or not to warn if dependencies are out of date.

  - Default: *[Boolean]* `true`.

- `cores`: By default, Roosevelt will run on 1 CPU, but you can change the number of cores that the app will run on with this parameter.

  - Default: *[Number]* `1`.

  - To use all available cores, set this value to `max`.

- `shutdownTimeout`: Maximum amount of time in milliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.

  - Default: *[Number]* `30000` (30 seconds).

## HTTPS parameters

- `https`: *[Object]* Run a HTTPS server using Roosevelt.
  - Object members:

    - `enable`: Enable a HTTPS server.

      - Default: *[Boolean]* `false`.

    - `force`: Disallow unencrypted HTTP and route all traffic through HTTPS.

      - Default: *[Boolean]* `false`.

    - `port`: The port your app will run a HTTPS server on.

      - Default: *[Number]* `43733`.

    - `authInfoPath`: *[Object]* Specify either the paths where the server certificate files can be found or set the appropriate parameters to be a PKCS#12-formatted string or certificate or key strings.
- Default: `undefined`.

- Object members:

  - `p12`: *[Object]* Parameter used when the server certificate/key is in PKCS#12 format.
      - Object members:

        - `p12Path`:  *[String]* Either the path to a PKCS#12-formatted file (e.g. a .p12 or .pfx file) or a PKCS#12-formatted string or buffer (e.g. the result of reading in the contents of a .p12 file).
    - Default: `undefined`.

  - `authCertAndKey`: *[Object]* Parameter used when the server certificate and key are in separate PEM-encoded files.
      - Object members:

        - `cert`: *[String]* Either the path to a PEM-encoded certificate file (e.g. .crt, .cer, etc.) or a PEM-encoded certificate string.
    - Default: `undefined`.

    - `key`: *[String]* Either the path to a PEM-encoded key file (e.g. .crt, .cer, etc.) or a PEM-encoded key string for the certificate given in `cert`.
        - Default: `undefined`.

    - `passphrase`: *[String]* Shared passphrase used for a single private key and/or a P12.
- Default: `undefined`.

- `caCert`: *[String]* Either the path to a PEM-encoded Certificate Authority root certificate or certificate chain or a PEM-encoded Certificate Authority root certificate or certificate chain string. This certificate (chain) will be used to verify client certificates presented to the server. It is only needed if `requestCert` and `rejectUnauthorized` are both set to `true` and the client certificates are not signed by a Certificate Authority in the default publicly trusted list of CAs [curated by Mozilla](https://hg.mozilla.org/mozilla-central/raw-file/tip/security/nss/lib/ckfw/builtins/certdata.txt).
    - Default: `undefined`.

    - `requestCert`: *[Boolean]* Set whether to request a certificate from the client attempting to connect to the server to verify the client's identity.
- Default: `undefined`.

- `rejectUnauthorized`: *[Boolean]* Set whether to reject connections from clients that do no present a valid certificate to the server. (Ignored if `requestCert` is set to `false`.)

  - Default:  `undefined`.

- Default: *[Object]* `{}`.

## MVC parameters

- `modelsPath`: Relative path on filesystem to where your model files are located.

  - Default: *[String]* `"mvc/models"`.

- `viewsPath`: Relative path on filesystem to where your view files are located.

  - Default: *[String]* `"mvc/views"`.

- `viewEngine`: What templating engine to use, formatted as *[String]* `"fileExtension: nodeModule"`.

- Default: *[String]* `"none"`.

- Will be set to `"html: teddy"` in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).

- Also by default when using the generator, the module [teddy](https://github.com/rooseveltframework/teddy) is marked as a dependency in `package.json`.

- To use multiple templating systems, supply an array of engines to use in the same string format. Each engine you use must also be marked as a dependency in your app's `package.json`. Whichever engine you supply first with this parameter will be considered the default.

- Example configuration using multiple templating systems: *[Object]*

      ```json
      {
        "viewEngine": [
          "html: teddy",
          "php: php",
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

- `routePrefix`: *[String]* A prefix prepended to your application's routes. Applies to all routes and static files.

  - Example: When set to `"foo"` a route bound to `/` will be instead be bound to `/foo/`.

  - Note: This prefix is exposed via the `routePrefix` Express variable which should be used for resolving the absolute paths to statics programmatically.

    - Example: An image located at `/images/teddy.jpg` can be resolved in a prefix-agnostic way via `` `${app.get('routePrefix')/images/teddy.jpg}` ``.

  - Default: `null`.

## Statics parameters

- `staticsRoot`: Relative path on filesystem to where your source static assets are located. By default this folder will not be made public, but is instead meant to store unprocessed or uncompressed source assets that will later be preprocessed and exposed in `public`.

  - Default: *[String]* `"statics"`.

- `htmlMinifier`: How you want Roosevelt to minify your HTML:

  - `enable`: *[Boolean]* Whether or not to minify HTML.

      - Note: Can also be disabled by the `minify` param.

  - Note: Minification is automatically disabled in development mode.

  - `exceptionRoutes`: *[Array]* List of controller routes that will skip minification entirely. Set to `false` to minify all URLs.

  - `options`: *[Object]* Parameters to supply to [html-minifier](https://github.com/kangax/html-minifier#options-quick-reference)'s API.

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

  - `sourcePath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and written to the `public` folder when the app is started.

  - `compiler`: *[Object]* Which CSS preprocessor (if any) to use.

    - `enable`: *[Boolean]* Whether or not to use a preprocessor.

    - `module`: *[String]* Node module name of the CSS preprocessor you wish to use.

      - Note: Currently [less](http://lesscss.org/), [sass](https://sass-lang.com/), and [stylus](http://stylus-lang.com/) are supported.

      - Note: Your chosen CSS preprocessor module must also be marked as a dependency in your app's `package.json`.

    - `options`: *[Object]* Parameters to send to the CSS preprocessor if it accepts any.

  - `minifier`: *[Object]* Params pertaining to CSS minifcation.

    - `enable`: *[Boolean]* Whether or not to minify CSS.
- Note: Can also be disabled by the `minify` param.

- `options`: *[Object]* Parameters to pass to the CSS minifier [clean-css](https://www.npmjs.com/package/clean-css), a list of which can be found in the [clean-css docs](https://github.com/jakubpawlowicz/clean-css#constructor-options).

- `allowlist`: Array of CSS files to allowlist for compiling. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.

  - Example array member: *[String]* `example.less:example.min.css` (compiles `example.less` into `example.min.css`).

- `output`: Subdirectory within `publicFolder` where compiled CSS files will be written to.

- `versionFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable containing your app's version number from `package.json`. Enable this option by supplying an object with the member variables `fileName` and `varName`. Versioning your static files is useful for resetting your users' browser cache when you release a new version of your app.

  - Default: `null`.

  - Example usage (with LESS): *[Object]*

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
          "enable" : false,
          "module": "less",
          "options": {}
        },
        "minifier": {
          "enable": true,
          "options": {}
        },
        "allowlist": null,
        "output": "css",
        "versionFile": null
      }
    ```

- `js`: *[Object]* How you want Roosevelt to handle module bundling and minifying your frontend JS:

  - `sourcePath`: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unminified JS source files which will be minified and written to the `public` folder when the app is started.

  - `webpack`: Parameters related to bundling JS with [Webpack](https://webpack.js.org/):

    - `enable`: Enable Webpack bundling.

    - `bundles`: *[Array]* Declare one or more Webpack configurations to bundle JS with.

      - `env`: *[String]* Bundle only in `dev` or `prod` mode. Omitting `env` will result in bundling in both modes.

      - `config`: *[Object]* or *[String]* The [Webpack configuration](https://webpack.js.org/configuration/) to send to Webpack. Can also be a path to a [Webpack config file](https://webpack.js.org/configuration/#use-different-config-file) relative to the app directory.

      - Examples: *[Array]* of *[Objects]*

        - Webpack bundle example declaring one bundle:

          ```json
          [
            {
              "config": {
                "entry": "${js.sourcePath}/main.js",
                "output": {
                  "path": "${publicFolder}/js",
                  "filename": "bundle.js"
                }
              }
            }
          ]
          ```

          - Webpack bundle example declaring one bundle only used in `dev` mode:

              ```json
              [
                {
                  "env": "dev",
                  "config": {
                    "entry": "${js.sourcePath}/main.js",
                    "output": {
                      "path": "${publicFolder}/js",
                      "filename": "bundle.js"
                    }
                  }
                }
              ]
              ```

          - Webpack bundle example declaring multiple bundles:

              ```json
              [
                {
                  "config": {
                    "entry": "${js.sourcePath}/main.js",
                    "output": {
                      "path": "${publicFolder}/js",
                      "filename": "bundle.js"
                    }
                  }
                },
                {
                  "config": {
                    "entry": "${js.sourcePath}/moreStuff.js",
                    "output": {
                      "path": "${publicFolder}/js",
                      "filename": "bundle2.js"
                    }
                  }
                },
                etc...
              ]
              ```

  - Default: *[Object]*

      ```json
      {
        "sourcePath": "js",
        "webpack": {
          "enable": false,
          "bundles": []
        }
      }
      ```

- `frontendReload`: Settings to use for the [reload](https://github.com/alallier/reload) module which automatically reloads your browser when your frontend code changes.

  - Default: *[Object]*

      ```json
      {
        "enable": true,
        "port": 9856,
        "httpsPort": 9857
      }
      ```

- `clientViews`: *[Object]* Allows you to expose view code to frontend JS for client-side templating.

  - `exposeAll`: *[Boolean]* Option to expose all templates.

    - Default: *[Boolean]* `false`.

  - `blocklist`: *[Array]* of *[Strings]* List of files or folders to exclude when `exposeAll` is enabled.

    - Default: *[Array]* `[]`.
  - Can also be set declaratively by putting a `<!-- roosevelt-blocklist -->` tag at the top of any template.

  - `allowlist`: *[Object]* of *[Arrays]* List of JS files to create mapped to which view files to expose.

    - Default: *[Object]* `{}`.

    - Example:

      ```json
      {
        "mainLayouts.js": ["baseLayout.html", "footer.html"],
        "forms.js": ["forms/formTemplate.html"]
      }
      ```

    - Can also be set declaratively by putting a `<!-- roosevelt-allowlist <filepath> -->` tag at the top of any template.

  - `defaultBundle`: *[String]* File name for the default JS view bundle.

    - Default: *[String]* `"bundle.js"`.

  - `output`: *[String]* Subdirectory within `publicFolder` to write JS view bundles to.

    - Default: *[String]* `"templates"`.

  - `minify`: *[Boolean]* Option to minify templates that are exposed via this feature.

    - Default: *[Boolean]* `true`.

  - `minifyOptions`: *[Object]* Parameters to supply to [html-minifier](https://github.com/kangax/html-minifier#options-quick-reference)'s API.

    - Uses the params you set in `htmlMinifier.options` if empty.

  - Default: *[Object]*

    ```json
    "clientViews": {
      "exposeAll": false,
      "blocklist": [],
      "allowlist": {},
      "defaultBundle": "bundle.js",
      "output": "templates",
      "minify": true,
      "minifyOptions": {}
    }
    ```

## Public folder parameters

- `publicFolder`: All files and folders in this directory will be exposed as static files in development mode or when `hostPublic` is enabled.

  - Default: *[String]* `"public"`.

- `favicon`: *[String]* Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.

  - Default: *[String]* `"none"`.
    - Will be set to `"images/favicon.ico"` in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).

- `symlinks`: *[Array]* Declare one or more symlinks to be generated at runtime.

  - `source`: *[String]* Path to be linked to.

    - Note: Will not attempt to generate a symlink to a source path that does not exist.

  - `dest`: *[String]* Path to place symlink.

    - Note: If this destination path already exists it will not be overwritten.

  - Default: *[Array]* of *[Objects]* `[]`.
    - Will be set to the following in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt):
      ```json
      [
        {
          "source": "${staticsRoot}/images",
          "dest": "${publicFolder}/images"
        }
      ]
      ```

- `versionedPublic`: If set to true, Roosevelt will prepend your app's version number from `package.json` to your public folder. Versioning your public folder is useful for resetting your users' browser cache when you release a new version.

  - Default: *[Boolean]* `false`.

- `hostPublic`: Whether or not to allow Roosevelt to host the public folder. By default in `production-proxy` mode Roosevelt will not expose the public folder. It's recommended instead that you host the public folder yourself directly through another web server, such as Apache or nginx.

  - Default: *[Boolean]* `false`.

## Events

Roosevelt provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
require('roosevelt')({
  onServerStart: (app) => { /* do something */ }
})
```

## Event list

- `onServerInit(app)`: Fired when the server begins starting, prior to any actions taken by Roosevelt. Note: some [Express variables exposed by Roosevelt](https://github.com/rooseveltframework/roosevelt#express-variables-exposed-by-roosevelt) are not available yet during this event.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onServerStart(app)`: Fired when the server starts.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onAppExit(app)`: Fired when the app recieves a kill signal.
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
- `onClientViewsProcess(template)`: Fired to preprocess templates before being exposed to the client.
  - `template`: A string containing a template written in any JS-based templating engine (e.g. Teddy, Pug, ejs, etc)

# Making controller files

Controller files are places to write [Express routes](http://expressjs.com/api.html#app.VERB). A route is the term Express uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`.

To make a new controller, make a new file in the controllers directory. For example:

```js
module.exports = (router, app) => {
  // router is an Express router
  // and app is the Express app created by Roosevelt

  // standard Express route
  router.route('/about').get((req, res) => {

    // load a data model
    let model = require('models/dataModel')

    // render a Teddy template and pass it the model
    res.render('about', model)
  })
}
```

Sometimes it is also useful to separate controller logic from your routing. This can be done by creating a reusable controller module.

An example would be creating a reusable controller for "404 Not Found" pages:

```js
// reusable controller "notFound.js"
module.exports = (app, req, res) => {
  let model = { content: 'Cannot find this page' }
  res.status(404)
  res.render('404', model)
}
```

Reusable controller modules differ from standard controller modules in that they accept `req` and `res` arguments in addition to `app`. They are meant to be called from within routes rather than define new routes.

This allows them to be called at will in any other controller's route when needed:

```js
// import the "notFound" controller logic previously defined
const throw404 = require('controllers/notFound')

module.exports = (router, app) => {
  router.route('/whatever').get((req, res) => {

    // test some logic that could fail
    // thus triggering the need for the 404 controller
    if (something) {

      // logic didn't fail
      // so render the page normally
      let model = require('models/dataModel')
      res.render('whatever', model)
    }
    else {

      // logic failed
      // so throw the 404 by executing your reusable controller
      throw404(app, req, res)
    }
  })
}
```

## Making isomorphic controller files

You can also write isomorphic controller files that can be shared on both the client and the server:

```js
// isomorphic controller file about.js
module.exports = (router, app) => {
  // router is an Express router
  // and app is the Express app created by Roosevelt

  // standard Express route
  router.route('/about').get((req, res) => {

    // get model data if we're on the server
    // isoRequire fails silently if we're on the client
    let model = router.isoRequire('models/dataModel') || window.model

    // if it's an API request (as defined by a request with content-type: 'application/json'),
    // then it will send JSON data
    // if not, it will render HTML
    router.apiRender(req, res, model) || res.render('about', model)

    // run client-side exclusive code
    if (router.client) {
      // get the model via a fetch, or extract it from the DOM, or whatever you want to do
      // or maybe model is already populated by window.model from a previous page you were on
      // also define DOM events and do other frontendy things
      console.log('hello frontend')
    }
  })
}
```

### roosevelt-router

When using controller files on the client, you will need to include and configure `roosevelt-router` in your main JS bundle before loading your controller files:

 ```js
 // main.js — frontend JS bundle entry point
 window.model = {} // declare a blank model for now, to be filled in later by fetching data from the server
 
 // require and configure roosevelt-router
 const router = require('roosevelt/lib/roosevelt-router')({
 
   // your templating system (required)
   templatingSystem: require('teddy'),
 
   // your templates (required)
   // requires use of clientViews feature of roosevelt
   templateBundle: require('views'),
 
   // supply a function to be called immediately when roosevelt-router's constructor is invoked
   // you can leave this undefined if you're using teddy and you don't want to customize
   // the default SPA rendering behavior
   onLoad: null, // required if not using teddy, optional if using teddy
 
   // define a res.render(template, model) function to render your templates
   // you can leave this undefined if you're using teddy and you don't want to customize
   // the default SPA rendering behavior
   renderMethod: null // required if not using teddy, optional if using teddy
 })
 
 require('about')(router) // load an isomorphic controller file
 
 router.init() // activate router
 
 ```

#### API

**Constructor parameters:**

When you call `roosevelt-router`'s constructor, e.g. `const router = require('roosevelt/lib/roosevelt-router')(params)`, the `params` object can accept the following methods:

- `templatingSystem` (required): Which HTML templating system you would like to use. Supply the Node.js module. `teddy` is recommended, but not required.
- `templateBundle` (required): A JavaScript object containing a bundle of HTML templates. It is recommended that you use the `clientViews` feature of Roosevelt to supply this, but not required.
- `onLoad`: A function that will be called immediately after `roosevelt-router`'s constructor is invoked. You can leave this undefined if you're using Teddy and you don't want to customize the default SPA rendering behavior.
  - Optional if using Teddy. Required if not using Teddy.
- `renderMethod`: Define a `res.render(template, model)` function to render your templates. You can leave this undefined if you're using Teddy and you don't want to customize the default SPA rendering behavior.
  - Optional if using Teddy. Required if not using Teddy. 

**Instance members:**

When you get a `router` object after instantiating `roosevelt-router` e.g. `const router = require('roosevelt/lib/roosevelt-router')(params)`, the following properties and methods are available to you:

- `router.isoRequire`: *[Function]* Like `require` but designed to fail silently allowing `||` chaining.
  - Example: `let model = router.isoRequire('models/dataModel') || window.model`.
    - Thus, if `models/dataModel` does not exist, it will fall back to `window.model`.
- `router.apiRender`: *[Function]* Send JSON data in response to the request instead of HTML, but only when the request's `content-type` is `application/json`. Otherwise, fails silently allowing `||` chaining.
  - Example: `router.apiRender(req, res, model) || res.render('about', model)`.
- `router.backend`: *[Boolean]* True if the execution context is the Node.js server.
- `router.server`: *[Boolean]* True if the execution context is the Node.js server.
- `router.frontend`: *[Boolean]* True if the execution context is the browser.
- `router.client`: *[Boolean]* True if the execution context is the browser.

# Making model files

Since the above example requires a model file named `dataModel`, you will need to make that too. To do that, place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
module.exports = {some: 'data'};
```

# Making view files

Views by default are [Teddy](https://github.com/rooseveltframework/teddy) templates. See the Teddy documentation for information about how to write Teddy templates.

You can also use different templating engines by tweaking Roosevelt's [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters).

# Express variables exposed by Roosevelt

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.

| Express variable                     | Description                                                  |
| ------------------------------------ | ------------------------------------------------------------ |
| `express`                            | The Express module.                                          |
| `router`                             | Instance of router module used by Roosevelt.                 |
| `routePrefix`                        | Prefix appended to routes via the `routePrefix` param. Will be `''` if not set. |
| `routes`                             | List of all routes loaded in the Express app by Roosevelt.   |
| *viewEngine* e.g. `teddy` by default | Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module. |
| `view engine`                        | Default view engine file extension, e.g. `.html`.            |
| `formidable`                         | The [formidable](https://github.com/felixge/node-formidable) module Roosevelt uses internally. Used for handling multipart forms. |
| `morgan`                             | The [morgan](https://github.com/expressjs/morgan) module Roosevelt uses internally. HTTP request logger middleware. |
| `logger`                             | The [roosevelt-logger](https://github.com/rooseveltframework/roosevelt-logger) module Roosevelt uses internally. Used for console logging. |
| `modelsPath`                         | Full path on the file system to where your app's models folder is located. |
| `viewsPath` or `views`               | Full path on the file system to where your app's views folder is located. |
| `controllersPath`                    | Full path on the file system to where your app's controllers folder is located. |
| `staticsRoot`                        | Full path on the file system to where your app's statics folder is located. |
| `publicFolder`                       | Full path on the file system to where your app's public folder is located. |
| `cssPath`                            | Full path on the file system to where your app's CSS source files are located. |
| `jsPath`                             | Full path on the file system to where your app's JS source files are located. |
| `cssCompiledOutput`                  | Full path on the file system to where your app's minified CSS files are located. |
| `clientViewsBundledOutput`           | Full path on the file system to where your app's client-exposed views folder is located. |
| `env`                                | Either `development` or `production`.                        |
| `params`                             | The parameters you sent to Roosevelt.                        |
| `appDir`                             | The directory the main module is in.                         |
| `appName`                            | The name of your app derived from `package.json`. Uses "Roosevelt Express" if no name is supplied. |
| `appVersion`                         | The version number of your app derived from `package.json`.  |
| `package`                            | The contents of `package.json`.                              |
| `roosevelt:state`                    | Application state, e.g. `disconnecting` if the app is currently being shut down. |

Additionally the Roosevelt constructor returns the following object:

| Roosevelt constructor returned object members | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `expressApp`             | *[Object]* The [Express app](http://expressjs.com/api.html#express) created by Roosevelt. |
| `httpServer`             | *[Object]* The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. `httpServer` is also available as a direct child of `app`, e.g. `app.httpServer`. |
| `httpsServer`            | *[Object]* The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt. `httpsServer` is also available as a direct child of `app`, e.g. `app.httpsServer`. |
| `reloadHttpServer`       | *[Object]* The [http instance of reload](https://github.com/alallier/reload#returns) created by Roosevelt. |
| `reloadHttpsServer`       | *[Object]* The [https instance of reload](https://github.com/alallier/reload#returns) created by Roosevelt. |
| `initServer(callback)`   | *[Method]* Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. Takes an optional callback. |
| `startServer`            | *[Method]* Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config. |
| `stopServer(close)`      | *[Method]* Stops the server and takes an optional argument `stopServer('close')` which stops the server from accepting new connections before exiting. |

# Express middleware and other configurations automatically loaded by Roosevelt

In addition to exposing a number of variables to Express and providing the MVC interface outlined above, Roosevelt also:

- Includes the [compression](https://github.com/expressjs/compression) middleware.
- Includes the [cookie-parser](https://github.com/expressjs/cookie-parser) middleware.
- Includes the [helmet](https://github.com/helmetjs/helmet) middleware.
- Logs HTTP requests to the console using [morgan](https://github.com/expressjs/morgan), specifically `morgan('combined')`.
- Includes the [method-override](https://github.com/expressjs/method-override) middleware.

# Supplying your own CSS preprocessor

In addition to Roosevelt's built-in support for the LESS, Sass, and Stylus preprocessors you can also define your own preprocessor on the fly at start time in Roosevelt's constructor like so:

```js
let app = require('roosevelt')({
  cssCompiler: app => {
    return {
      versionCode: app => {
        // write code to return the version of your app here
      },
      parse: (app, filePath) => {
        // write code to preprocess CSS here
      }
    }
  }
})
```

API:

- `cssCompiler(app)`: Custom CSS preprocessor.
  - `versionCode(app)`: Function to return the version of your app. This is needed to support the `versionFile` feature of Roosevelt's CSS preprocessor API.
    - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
  - `parse(app, fileName)`: Function to preprocess CSS.
    - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
    - `filePath`: The path to the file being preprocessed.

Note: When a custom preprocessor is defined in this way it will override the selected preprocessor specified in `css.compiler.module`.

# Documentation for previous versions of Roosevelt

- *[0.18.x](https://github.com/rooseveltframework/roosevelt/blob/3bdd5146b468c4c6ccfa0b76b0f94f19f0b4fa19/README.md)*
- *[0.17.x](https://github.com/rooseveltframework/roosevelt/blob/18eae61db07704e5cbf02cbb4e0a998f7e34fa2c/README.md)*
- *[0.16.x](https://github.com/rooseveltframework/roosevelt/blob/b33046c0281084a2dc0cde26dc38c2a538484c57/README.md)*
- *[0.15.x](https://github.com/rooseveltframework/roosevelt/blob/1b5680c67ed79a2285b536d735c526413613eb9b/README.md)*
- *[0.14.x](https://github.com/rooseveltframework/roosevelt/blob/16e5e59083cecf2e2395e6d77d0cc5db0d0f7342/README.md)*
- *[0.13.x](https://github.com/rooseveltframework/roosevelt/blob/a308aff84d1415c3325b781f371fd3c3c915946c/README.md)*
- *[0.12.x](https://github.com/rooseveltframework/roosevelt/blob/59b00cab727bc754e1bcaf2d1df6d76e54630dc4/README.md)*
- *[0.11.x](https://github.com/rooseveltframework/roosevelt/blob/df3f4f60a08215fcbae7b5c9765623bb46c2cd2c/README.md)*
- *[0.10.x](https://github.com/rooseveltframework/roosevelt/blob/fac53c2c8d6fedd74f4c3ef85c481dba250dee00/README.md)*
- *[0.9.x](https://github.com/rooseveltframework/roosevelt/blob/15031010974475f7baf2355b9e06a977675db269/README.md)*
- *[0.8.x](https://github.com/rooseveltframework/roosevelt/blob/a99c44edc022fee3c0e49b8f0f81d41f8957db27/README.md)*
- *[0.7.x](https://github.com/rooseveltframework/roosevelt/blob/b57533979d2962b524d217d125f3abafb7b5a94c/README.md)*
- *[0.6.x](https://github.com/rooseveltframework/roosevelt/blob/44bd29c2739785c7a1a4396287d49e8d9733af2b/README.md)*
- Older… [here be dragons](https://en.wikipedia.org/wiki/Here_be_dragons).
