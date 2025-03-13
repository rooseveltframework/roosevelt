# Roosevelt MVC web framework

[![Build Status](https://github.com/rooseveltframework/roosevelt/workflows/CI/badge.svg
)](https://github.com/rooseveltframework/roosevelt/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/roosevelt.svg)](https://www.npmjs.com/package/roosevelt)

Roosevelt is a web application development framework based on [Express](http://expressjs.com) that aims to be the easiest web framework on the [Node.js](https://nodejs.org) stack to learn and use.

Some notable features:

- Boilerplate minimized. Teddy Roosevelt — referred to by Cracked magazine as the "[the most badass President of all-time](http://www.cracked.com/article_15895_the-5-most-badass-presidents-all-time_p5.html)" — curtailed the abuse of monopolists, so there's no way he would ever put up with all the indecipherable boilerplate common to other web frameworks.
  - By contrast, the Express framework itself adopts a very minimalist philosophy. If you build a vanilla Express app yourself, you will need to manually include and configure a lot of additional modules to handle very basic things such as handling POST requests, file uploads, logging, security hardening, template parsing, CSS/JS preprocessing and bundling, etc. Roosevelt includes these and configures them properly for you.

- [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)-based default directory structure.
- [Teddy](https://github.com/rooseveltframework/teddy) HTML templates by default which are much easier to read and maintain than common alternatives. Can be configured to use any templating system that supports Express.
  - Need some extra speed in template parsing? Consider writing your templates in [PHP](https://php.net)! The Roosevelt team also built a view engine that lets you [use PHP as your templating engine](https://github.com/rooseveltframework/node-php-runner) in a Roosevelt app or any other Express application. PHP should be faster than any JS-based templating engine for complex templates since its parser is written in C rather than JS.
- [LESS](http://lesscss.org) preconfigured out of the box to intelligently minify your external-facing CSS files via [clean-css](https://www.npmjs.com/package/clean-css). There's also built-in support for [Sass](https://sass-lang.com) and [Stylus](https://stylus-lang.com). Other CSS preprocessors can be used as well with a bit of extra configuration.
- [Webpack](https://webpack.js.org/) fully integrated providing an easy to use interface for bundling and minifying your frontend JS.
- Code-reloading in development mode via [nodemon](https://nodemon.io) for server-side changes and [express-browser-reload](https://github.com/rooseveltframework/express-browser-reload) for frontend changes.
- HTML validation done automatically in development mode for your post-server rendered HTML powered by [express-html-validator](https://github.com/rooseveltframework/express-html-validator).
- Optional HTML attribute minification of your HTML attribute class names, IDs, and `data-*` attributes in a coordinated fashion across your HTML, CSS, and JS files powered by [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes).
- Optional isomorphic (aka universal, [amphibious](https://twitter.com/kethinov/status/566896168324825088), etc) controller and view support based on [single-page-express](https://github.com/rooseveltframework/single-page-express) so your routes and template code can be shared on the client and the server without modification for building single page apps with maximal code reuse on both sides without having to use a big JS framework to accomplish the task instead.

![Teddy Roosevelt's facial hair is a curly brace.](https://github.com/rooseveltframework/generator-roosevelt/blob/main/generators/app/templates/statics/images/teddy.jpg "Teddy Roosevelt's facial hair is a curly brace.")

*This is documentation for the current version of Roosevelt. If you need API documentation for a previous version of Roosevelt, [look here](https://github.com/rooseveltframework/roosevelt#documentation-for-previous-versions-of-roosevelt).*

## Create and run a Roosevelt app

### Prerequisites

First you will need to install [Node.js](http://nodejs.org). Both the current and LTS version of Node.js are supported. It is recommended that you have both the current and LTS versions of Node.js installed on your system. To do that, it is recommended that you install Node.js using a Node.js version manager like [nvm](https://github.com/creationix/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) rather than the official installer, as a version manager will allow you to switch between multiple versions of Node.js easily.

### Roosevelt app generator

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

After creating your app, `cd` to your app's directory and:

- Install dependencies: `npm i`
- Run the app in development mode: `npm run development`
  - Default shorthands:
    - `npm run dev`
    - `npm run d`

See [available npm scripts](https://github.com/rooseveltframework/roosevelt#available-npm-scripts) for more ways to run the app.

### Create a Roosevelt app manually

It is also possible to create a Roosevelt app without using the app generator. This will result in a more minimalist default configuration (e.g. no CSS or JS preprocessors enabled by default).

To do that:

- First create a new folder and `cd` into it.

- Then `npm i roosevelt`. This will create a `node_modules` folder with Roosevelt and its bare minimum dependencies.

- Create a file named `app.js`.

- Put this code in `app.js`:

  ```javascript
  require('roosevelt')({
    'makeBuildArtifacts': true
  }).startServer()
  ```

- Then `node app.js`. If the `makeBuildArtifacts` parameter is set to true like the above code example, an entire Roosevelt app with bare minimum viability will be created and the server will be started. See [configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters) for more information about parameter configuration.

### Use Roosevelt as a static site generator

Create a Roosevelt app using one of the methods above, then set the `makeBuildArtifacts` param to the value of `'staticsOnly'` which will allow Roosevelt to create static files but skip the creation of the MVC directories:

  ```javascript
  require('roosevelt')({
    makeBuildArtifacts: 'staticsOnly'
  }).init()
  ```

You will also need to set `viewEngine` if you want to render HTML templates into static pages and supply data to the templates:

  ```javascript
  require('roosevelt')({
    makeBuildArtifacts: 'staticsOnly',
    viewEngine: 'html: teddy',
    onServerInit: (app) => {
      app.get('htmlModels')['index.html'] = {
        hello: 'world!'
      }
    }
  }).init()
  ```

If model data is not supplied by configuration, Roosevelt will try to automatically load a model from a JS file with the same name alongside the template if it exists instead. For example if an index.js file exists next to index.html and the model is not defined by configuration like in the example above, then the index.js file will be used to set the model so long as it exports either an object or a function that returns an object.

### Available npm scripts

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
  - Script is short for: `nodemon app.js --production-proxy-mode`
- `npm run generate-certs`: Generates self-signed HTTPS certs for your app.
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/certsGenerator.js`
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.
- `npm run generate-csrf-secret`: Generates a secret key for the CSRF protection.
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/csrfSecretGenerator.js`
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.
- `npm run generate-session-secret`: Generates a secret key for the `express-session` module.
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/sessionSecretGenerator.js`
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.
- `npm run generate-secrets`: Runs the above three scripts.
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.
- `npm run audit-config`: Scans current `rooseveltConfig` and `scripts` in `package.json` and warns about any parameters or npm scripts that don't match the current Roosevelt API:
  - Script is short for: `node ./node_modules/roosevelt/lib/scripts/configAuditor.js`
  - This will run automatically whenever you run `npm i` or `npm ci` as well.

### Available command line arguments

- `node app.js --production-mode`: Runs the app in production mode.
  - Default shorthands:
    - `--prod`
    - `-p`
- `node app.js --development-mode`: Runs the app in development mode.
  - Default shorthands:
    - `--dev`
    - `-d`
- `node app.js --build`: Only runs the build scripts and doesn't start the app.
  - Default shorthands:
    - `-b`
- `node app.js --webpack=verbose`: Enables webpack to print verbose errors to the console.
  - Default shorthands:
    - `--wp=verbose`
    - `-w=verbose`
- `node app.js --webpack=verbose-file`: Enables webpack to print verbose errors to the console as well as write a webpackError file to the app's root directory containing the full error.
  - Default shorthands:
    - `--wp=verbose-file`
    - `-w=verbose-file`
- `node app.js --production-proxy-mode`: Runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only listens to requests coming from localhost and does not serve anything in the public folder. This mode is useful when you want to host your app behind a reverse proxy from a web server like Apache or nginx and [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).
  - Default shorthands:
    - `--prodproxy`
    - `-x`
- `node app.js --enable-validator`: Forces the HTML validator to be enabled.
  - Default shorthands:
    - `--html-validator`
    - `-h`
- `node app.js --disable-validator`: Forces the HTML validator to be disabled.
  - Default shorthands:
    - `--raw`
    - `-r`

### Combining npm scripts and command line arguments

The npm scripts can be combined with the command line flags.

For example, running `npm run d -- -r` will run your app in development mode and force the HTML validator to be disabled.

### Recognized environment variables

The following is a list of [environment variables](https://en.wikipedia.org/wiki/Environment_variable) that Roosevelt listens for.

- `NODE_ENV`:
  - Set to `production` to force the app into production mode.
  - Set to `development` to force the app into development mode.
- `NODE_PORT`: Default HTTP port to run your app on.
- `HTTP_PORT`: Default HTTP port to run your app on. Takes precedence over `NODE_PORT`.
- `HTTPS_PORT`: Default HTTPS port to run your app on.
- `DISABLE_HTTPS`: When set to `true`, the HTTPS server will be disabled and the app will revert to HTTP regardless of what is set in the `rooseveltConfig`.
- `MAKE_BUILD_ARTIFACTS`: Lets you set Roosevelt's `makeBuildArtifacts` param via environment variable.

Environment variable precedence:

- Environment variables supersede your app's [parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters).
- Environment variables can be overridden with [command line arguments](https://github.com/rooseveltframework/roosevelt#available-command-line-arguments).

## Default directory structure

Below is the default directory structure for an app created using the Roosevelt app generator:

- Application logic:

  - `app.js`: Entry point to your application. Feel free to rename this, but make sure to update `package.json`'s references to it.

  - `lib`: Random includable JS files that don't belong in any of the other directories. It has been added to the `require` stack so you can simply `require('lib/someFile')`.

  - `mvc`: Folder for models, views, and controllers. All configurable via parameters (see below).
    - `controllers`: Folder for controller files; the "C" in MVC. This is where your HTTP routes will go.
    - `models`: Folder for model files; the "M" in MVC. This is where you will get data to display in your views e.g. by querying a database or do other business logic.
    - `views`: Folder for view files; the "V" in MVC. This is where your HTML templates will go.

- Static files:

  - `public`: All contents within this folder will be exposed as static files.

  - `statics`: Folder for source CSS, image, JS, and other static files. By default some of the contents of this folder are symlinked to from `public`, which you can configure via params. See [configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters) for more information about parameter configuration.
    - `css`: Folder for source CSS files.
    - `images`: Folder for source image files.
    - `js`: Folder for source JS files.
    - `pages`: Folder for HTML templates that get rendered and minified into static pages.

- Application infrastructure:

  - `.gitignore`: A standard file which contains a list of files and folders to ignore if your project is in a [git](https://git-scm.com/) repo. Delete it if you're not using git. The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before committing a fresh Roosevelt app to your git repo.
    - Some notable things ignored by default and why:
      - `node_modules`: This folder is created when installing dependencies using the `npm i` step to set up your app. It's generally not recommended to commit the `node_modules` folder or any other build artifacts to git.
      - `public`: It's recommended that you don't create files in this folder manually, but instead use the `statics` parameter detailed below to expose folders in your `statics` directory to `public` via auto-generated symlinks.
      - `secrets`: A folder for "secret" files, e.g. session keys, HTTPS certs, passwords, etc. Since this folder contains sensitive information, it should not be committed to git.
  - `node_modules`: A standard folder created by Node.js where all modules your app depends on (such as Roosevelt) are installed to. This folder is created when installing dependencies using the `npm i` command.

  - `package.json`: A file common to most Node.js apps for configuring your app.
  - `package-lock.json`: An auto-generated file common to most Node.js apps containing a map of your dependency tree. This is created after you run `npm i` for the first time.
  - `rooseveltConfig.json`: Where your Roosevelt config is stored and what your params are set to. See [configure your app with parameters](https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters) for more information about parameter configuration.
  - `secrets`: A folder for "secret" files, e.g. session keys, HTTPS certs, passwords, etc. It is added to  `.gitignore`.

## Configure your app with parameters

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

### MVC parameters

- `controllersPath`: Relative path on filesystem to where your controller files are located.
  - Default: *[String]* `"mvc/controllers"`.
- `modelsPath`: Relative path on filesystem to where your model files are located.
  - Default: *[String]* `"mvc/models"`.
- `viewsPath`: Relative path on filesystem to where your view files are located.
  - Default: *[String]* `"mvc/views"`.
- `preprocessedViewsPath`: Relative path on filesystem to where your preprocessed view files will be written to. Preprocessed view files are view files that have had their uses of web components progressively enhanced using the [progressively-enhance-web-components](https://github.com/rooseveltframework/progressively-enhance-web-components) module.
  - Default: *[String]* `"mvc/.preprocessed_views"`.
  - To disable this feature, set the value to `false`.

- `secretsPath`: Directory that stores certs, keys, and secrets.

  - Default: *[String]* `secrets`.

  - Important: Changing this value will require updating `.gitignore`.

### Development mode parameters

- `frontendReload`: Settings to use for the browser reload feature which automatically reloads your browser when your frontend code changes. This feature is only available in development mode.
  - Options:
    - `enable`: Whether or not to enable `reload`.
      - Default: *[Boolean]* `true`.
    - `exceptionRoutes`: List of routes to exclude from Reload automatically injecting its script onto.
      - Default: *[Array]* with no items in it. This means Reload will inject its script on all routes by default.
    - `expressBrowserReloadParams`: Params to pass to [express-browser-reload](https://github.com/rooseveltframework/express-browser-reload).
      - Default: *[Object]*
      ```json
      {
        "skipDeletingConnections": true
      }
      ```
  - Default: *[Object]*
    ```json
    {
      "enable": true,
      "exceptionRoutes": [],
      "expressBrowserReloadParams": {
        "skipDeletingConnections": true
      }
    }
  - Note: This feature will only be active on pages with a `<body>` tag.
    ```

- `htmlValidator`: Parameters to send to [express-html-validator](https://github.com/rooseveltframework/express-html-validator#configuration). This feature is only available in development mode.

  - `enable`: *[Boolean]* Enables or disables the built-in HTML validator.

  - `exceptions`: A set of params that can be used to prevent validation in certain scenarios.

    - `header` *[String]*: A custom header that when set will disable the validator on a per request basis.

      - Default: `'Partial'`.

    - `modelValue` *[String]*: An entry in your data model passed along with a `res.render` that when set will disable validation on the rendered HTML.

      - Default: `'_disableValidator'`.

  - `validatorConfig` *[Object]*: [html-validate configuration](https://html-validate.org/usage/#configuration) that determines what errors the validator looks for.

    - The full list of available validator rules can be found [here](https://html-validate.org/rules/).

    - This configuration can also be set by a `.htmlValidate.json` file placed in your app root directory.

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

### Deployment parameters

- `hostPublic`: Whether or not to allow Roosevelt to host the public folder. By default in `production-proxy` mode Roosevelt will not expose the public folder. It's recommended instead that you host the public folder through another web server, such as Apache or nginx that is better optimized for hosting static files.

  - Default: *[Boolean]* `false`.

- `https`: *[Object]* params for configuring the HTTPS server. HTTPS is disabled by default in apps created manually and enabled by default in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).

  - Default: *[Object]* `{}`.
  - Object members:

    - `enable`: Enable HTTPS server.
    - Default: *[Boolean]* `false`.
    - `port`: The port your app will run the HTTPS server on.
      - Default: *[Number]* `43733`.
  - `force`: Disallow unencrypted HTTP and route all traffic through HTTPS.
    - Default: *[Boolean]* `false`.
  - `autoCert`: Will create self-signed HTTPS certificates in development mode as long as they don't already exist.
    - Default: *[Boolean]* `true`.
  - `authInfoPath`: *[Object]* Specify either the paths where the server certificate files can be found or set the appropriate parameters to be a PKCS#12-formatted string or certificate or key strings.
    - Default: *[Object]* `undefined`.
    - Object members:
      - `p12`: *[Object]* Parameter used when the server certificate/key is in PKCS#12 format.
        - Default: *[Object]* `undefined`.
        - Object members:
          - `p12Path`: *[String]* Either the path relative to `secretsPath` to a PKCS#12-formatted file (e.g. a .p12 or .pfx file) or a PKCS#12-formatted string or buffer (e.g. the result of reading in the contents of a .p12 file).
            - Default: `undefined`.
      - `authCertAndKey`: *[Object]* Parameter used when the server certificate and key are in separate PEM-encoded files.
        - Object members:
          - `cert`: *[String]* Either the path relative to `secretsPath` to a PEM-encoded certificate file (e.g. .crt, .cer, etc.) or a PEM-encoded certificate string.
            - Default: `undefined`.
          - `key`: *[String]* Either the path relative to `secretsPath` to a PEM-encoded key file (e.g. .crt, .cer, etc.) or a PEM-encoded key string for the certificate given in `cert`.
            - Default: `undefined`.
  - `passphrase`: *[String]* Shared passphrase used for a single private key and/or a P12.
    - Default: `undefined`.
  - `requestCert`: *[Boolean]* Set whether to request a certificate from the client attempting to connect to the server to verify the client's identity.
    - Default: `undefined`.
  - `rejectUnauthorized`: *[Boolean]* Set whether to reject connections from clients that do no present a valid certificate to the server. (Ignored if `requestCert` is set to `false`.)
    - Default:  `undefined`.
  - `caCert`: *[String]* Either the path relative to `secretsPath` to a PEM-encoded Certificate Authority root certificate or certificate chain or a PEM-encoded Certificate Authority root certificate or certificate chain string. This certificate (chain) will be used to verify client certificates presented to the server. It is only needed if `requestCert` and `rejectUnauthorized` are both set to `true` and the client certificates are not signed by a Certificate Authority in the default publicly trusted list of CAs [curated by Mozilla](https://hg.mozilla.org/mozilla-central/raw-file/tip/security/nss/lib/ckfw/builtins/certdata.txt).
    - Default: `undefined`.

- `localhostOnly`: Listen only to requests coming from localhost in production mode. This is useful in environments where it is expected that HTTP requests to your app will be proxied through a more traditional web server like Apache or nginx. This setting is ignored in development mode.

  - Default: *[Boolean]* `true`.

- `mode`: Decides whether your app starts in production mode or development mode by default.

  - Default: *[String]* `production`.

- `port`: The HTTP port your app will run on. This setting is ignored if the app is set to force HTTPS-only mode.

  - Default: *[Number]* `43711`.

- `shutdownTimeout`: Maximum amount of time in milliseconds given to Roosevelt to gracefully shut itself down when sent the kill signal.

  - Default: *[Number]* `30000` (30 seconds).

### App behavior parameters

- `appDir`: Root directory of your application.

  - Default: *[String]* The directory where your app's `package.json` is located.

- `bodyParser`: Parameters to supply to the [body-parser](https://github.com/expressjs/body-parser) module which handles POST requests.

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

- `csrfProtection`: Whether to enable [Cross-Site Request Forgery](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protection.

  - Default: *[Boolean]* `true`.
  - To exempt certain routes from protection, supply an object as your config with an array of exemptions.
    - Example: *[Object]*

    ```json
    {
      "exemptions": [
        "/foo",
        "/bar",
        "/baz"
      ]
    }
    ```

- `enableCLIFlags`: Enables parsing of command line flags. Disable this if you want to handle them yourself or if you don't want Roosevelt to listen to the command line flags it listens for by default.

  - Default: *[Boolean]* `true`.

- `errorPages`: Relative path on filesystem to where your various error page controller files are located. If you do not supply them, Roosevelt will use its default ones instead:

  - `notFound`: Your [404 Not Found](https://en.wikipedia.org/wiki/HTTP_404) error page.

    - Default: *[String]* `"404.js"`.

  - `forbidden`: Your [403 Forbidden](https://en.wikipedia.org/wiki/HTTP_403) error page.

    - Default: *[String]* `"403.js"`.

  - `internalServerError`: Your [Internal Server Error](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors) error page.

    - Default: *[String]* `"5xx.js"`.

  - `serviceUnavailable`: Your [503 Service Unavailable](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_errors) error page.

    - Default: *[String]* `"503.js"`.

- `expressSession`: Parameter(s) to pass to the [express-session](https://github.com/expressjs/session) module.

  - Default: *[Boolean]* `true`.

    - If `expressSession` is set to `true`, it will supply to following configuration to `express-session`:

      ```json
      {
        "secret": [an auto-generated secret],
        "resave": false, // usually a bad idea to set to true
        "saveUninitialized": false, // usually a bad idea to set to true
        "cookie": {
          "secure": false, // will automatically be set to true if https is enabled
          "sameSite": "strict", // adds same site enforcement
          "maxAge": 347126472000 // sets expiration very far in the future (~11 years) to basically never expire
        }
        "store": [the expressSessionStore.instance Roosevelt param]
      }
      ```

      - Roosevelt sets `express-session` to use [memorystore](https://github.com/roccomuso/memorystore) as the default session store.

      - The default setting for `maxAge` is ~11 years. You should set that to be shorter in use cases where you want sessions to expire regularly, e.g. if you want users to reauthorize and login again frequently for security reasons.

  - If you supply your own parameters to `express-session`, it is recommended you take the above default configuration and modify it.

- `expressSessionStore`: Define a custom session store to use with `express-session` instead of the default one provided by Roosevelt. This is recommended if you plan to shard your app across multiple separate processes or scale it to multiple servers.

  - `filename`: Name of the session file.
    - Default: *[String]* `sessions.sqlite`
  - `instance`: *[Object]* A store instance. See [this list](https://expressjs.com/en/resources/middleware/session.html#compatible-session-stores) for compatible stores.
  - `preset`: *[String]* Available presets provided by Roosevelt. Only used if `instance` is not provided.
    - Available options:
      - `default`: Use Roosevelt's default session store, which is [better-sqlite3-session-store](https://www.npmjs.com/package/better-sqlite3-session-store).
      - `express-session-default`: Use `express-session`'s default session store (not recommended).
  - `presetOptions`: Options to pass to the preset session store if one is selected. Only used if `instance` is not provided.
    - Default: *[Object]*
      - `checkPeriod`: How long, in milliseconds, the memory store will check for expired items.
        - Default: *[Number]* `86400000` (1 day).
      - `ttl`: How long, in milliseconds, before a session is expired.
        - Default: *[Number]* the value of `checkPeriod`.
      - `max`: The maximum size of the cache, checked by applying the length function to all values in the cache.
        - Default: *[Number]* `Infinity`.

  - Either `instance` or `preset` must be set for this param to work properly.

- `formidable`: Parameters to pass to [formidable](https://github.com/felixge/node-formidable) using [formidable's API](https://github.com/felixge/node-formidable#api) for multipart form processing (file uploads). Access files uploaded in your controllers by examining the `req.files` object. Roosevelt will remove any files uploaded to the upload directory when the request ends automatically. To keep any, be sure to move them before the request ends.

  - Default: *[Object]*

    ```json
    {
      "multiples": true // enables multiple files to be uploaded simultaneously
    }
    ```

  - To disable multipart forms entirely, set `formidable` to `false`.

- `helmet`: Parameters to pass to the [helmet](https://github.com/helmetjs/helmet) module. This module helps secure Express apps by setting HTTP response headers.

  - Default: *[Object]* The default options are specified in the [helmet docs](https://helmetjs.github.io/), with the following exceptions that Roosevelt makes to the default `Content-Security-Policy` settings:
    - The `upgrade-insecure-requests` directive has been removed. This change prevents [this bug](https://github.com/rooseveltframework/roosevelt/issues/964).
    - The `script-src` directive has been set to `'unsafe-inline'`. This makes it possible to use inline scripts.
    - The `form-action` directive has been set to `null`. This makes it possible to submit forms to other domains.
    - You can reverse any of these changes by configuring helmet yourself.
  - To disable helmet entirely, set the param to `false`.

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

- `makeBuildArtifacts`: When enabled Roosevelt will generate user-specified directories, CSS/JS bundles, etc.

  - Default: *[Boolean]* `false` for apps created manually.

  - Will be set to `true` in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).
  - Can also accept a value of `'staticsOnly'` which will allow Roosevelt to create static files but skip the creation of the MVC directories.

- `routePrefix`: *[String]* A prefix prepended to your application's routes. Applies to all routes and static files.

  - Example: When set to `"foo"` a route bound to `/` will be instead be bound to `/foo/`.

  - This prefix is exposed via the `routePrefix` Express variable which should be used for resolving the absolute paths to statics programmatically.

    - Example: An image located at `/images/teddy.jpg` can be resolved in a prefix-agnostic way via `` `${app.get('routePrefix')/images/teddy.jpg}` ``.

  - Default: `null`.

- `viewEngine`: What templating engine to use, formatted as *[String]* `"fileExtension: nodeModule"`.

  - Default: *[String]* `"none"` for apps created manually.

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

### Isomorphic parameters

- `clientControllers`: *[Object]* Allows you to expose controller (route) file code to frontend JS for client-side routing.

  - `enable`: *[Boolean]* Whether or not to bundle view files.

  - `exposeAll`: *[Boolean]* Option to expose all templates.

    - Default: *[Boolean]* `false`.

  - `blocklist`: *[Array]* of *[Strings]* List of files or folders to exclude when `exposeAll` is enabled.

    - Default: *[Array]* `[]`.

    - Can also be set declaratively by putting a `// roosevelt-blocklist` comment at the top of any controller file.

  - `allowlist`: *[Object]* of *[Arrays]* List of JS files to create mapped to which view files to expose.

    - Default: *[Object]* `{}`.

    - Example:

      ```json
      {
        "mainPages.js": ["index.js", "about.js"],
        "account.js": ["login.js"]
      }
      ```

    - Can also be set declaratively by putting a `// roosevelt-allowlist <filepath>` comment at the top of any controller file.

  - `defaultBundle`: *[String]* File name for the default JS view bundle.

    - Default: *[String]* `"controllers.js"`.

  - `output`: *[String]* Subdirectory within `publicFolder` to write JS view bundles to.

    - Default: *[String]* `"js"`.

  - Default: *[Object]*

    ```json
    "clientViews": {
      "exposeAll": false,
      "blocklist": [],
      "allowlist": {},
      "defaultBundle": "views.js",
      "output": "js"
    }
    ```

  - Example output to your `controllers.js` file:

    ```javascript
    module.exports = (router, app) => {
      app = app || router
      require('homepage.js')(router, app)
      require('secondPage.js')(router, app)
      // etc
    }
    ```

- `clientViews`: *[Object]* Allows you to expose view (template) file code to frontend JS for client-side templating.

  - `enable`: *[Boolean]* Whether or not to bundle view files.

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

    - Default: *[String]* `"views.js"`.

  - `output`: *[String]* Subdirectory within `publicFolder` to write JS view bundles to.

    - Default: *[String]* `"js"`.

  - `minify`: *[Boolean]* Option to minify templates that are exposed via this feature.

    - Default: *[Boolean]* `false`.

  - `minifyOptions`: *[Object]* Parameters to supply to [html-minifier](https://github.com/terser/html-minifier-terser#options-quick-reference)'s API.

    - Uses the params you set in `html.minifier.options` if empty.

  - Default: *[Object]*

    ```json
    "clientViews": {
      "exposeAll": false,
      "blocklist": [],
      "allowlist": {},
      "defaultBundle": "views.js",
      "output": "js",
      "minify": true,
      "minifyOptions": {}
    }
    ```

  - Example output to your `views.js` file:

    ```json
    module.exports = {
      "index": "<p>html for some page</p>",
      "secondPage": "<p>html for some other page</p>"
    }
    ```

### Statics parameters

- `html`: Generate static HTML pages:

  - `sourcePath`: Subdirectory within `staticsRoot` where your static HTML files are located. By default this folder will not be made public, but is instead meant to store unminified / unprocessed HTML template source files which will be rendered, minified, and written to the `public` folder when the app is started.

  - `allowlist`: *[Array]* of *[Strings]* List of templates to render, minify, and write to the `public` folder when the app is started. If the list is empty, all templates in your `sourcePath` will be sourced. Supports wildcard matching, e.g. `dir/*`.

  - `blocklist`: *[Array]* of *[Strings]* List of templates in your `sourcePath` to skip. Supports wildcard matching, e.g. `dir/*`.

  - `models`: Data to pass to templates by file path / file name.

    - Example:

      ```json
      {
        "models": {
          "index.html": {
            "some": "data"
          },
          "subdirectory/otherFile.html": {
            "someOther": "data"
          }
        }
      }
      ```

    - If this data is not supplied by configuration, Roosevelt will try to automatically load a model from a JS file with the same name alongside the template if it exists instead. For example if an index.js file exists next to index.html and the model is not defined by configuration like in the example above, then the index.js file will be used to set the model so long as it exports either an object or a function that returns an object.

  - `output`: Subdirectory within `publicFolder` where parsed and minified HTML files will be written to.

  - `minifier`: How you want Roosevelt to minify your HTML:

    - `enable`: *[Boolean]* Whether or not to minify HTML.

      - Can also be disabled by the `minify` param.
      - Minification is automatically disabled in development mode.

    - `exceptionRoutes`: *[Array]* List of controller routes that will skip minification entirely. Set to `false` to minify all URLs.

    - `options`: *[Object]* Parameters to supply to [html-minifier](https://github.com/kangax/html-minifier#options-quick-reference)'s API.

  - Default: *[Object]*

    ```json
    {
      "sourcePath": "pages",
      "allowlist": null,
      "blocklist": null,
      "models": {},
      "output": "",
      "minifier": {
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
    }
    ```

- `css`: *[Object]* How you want Roosevelt to configure your CSS preprocessor:

  - `sourcePath`: Subdirectory within `staticsRoot` where your CSS files are located. By default this folder will not be made public, but is instead meant to store unminified CSS source files which will be minified and written to the `public` folder when the app is started.

  - `compiler`: *[Object]* Which CSS preprocessor (if any) to use.

    - `enable`: *[Boolean]* Whether or not to use a preprocessor.

    - `module`: *[String]* Node module name of the CSS preprocessor you wish to use.

      - Currently [less](http://lesscss.org/), [sass](https://sass-lang.com/), and [stylus](http://stylus-lang.com/) are supported.

      - Your chosen CSS preprocessor module must also be marked as a dependency in your app's `package.json`.

    - `options`: *[Object]* Parameters to send to the CSS preprocessor if it accepts any.

  - `minifier`: *[Object]* Params pertaining to CSS minifcation.

    - `enable`: *[Boolean]* Whether or not to minify CSS.
      - Can also be disabled by the `minify` param.

  - `options`: *[Object]* Parameters to pass to the CSS minifier [clean-css](https://www.npmjs.com/package/clean-css), a list of which can be found in the [clean-css docs](https://github.com/jakubpawlowicz/clean-css#constructor-options).

  - `allowlist`: Array of CSS files to allow for compiling. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.

    - Example array member: *[String]* `example.less:example.min.css` compiles `example.less` into `example.min.css`.

  - `output`: Subdirectory within `publicFolder` where compiled CSS files will be written to.

  - `versionFile`: If enabled, Roosevelt will create a CSS file which declares a CSS variable containing your app's version number from `package.json`. Enable this option by supplying an object with the member variables `fileName` and `varName`. Versioning your static files is useful for resetting your users' browser cache when you release a new version of your app.

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

- `favicon`: *[String]* Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file.

  - Default: *[String]* `"none"`.
    - Will be set to `"images/favicon.ico"` in apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt).

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

    - `verbose`: *[string]* Enable Webpack verbose error handler.

  - Default: *[Object]* for manually created apps.

    ```json
    {
      "sourcePath": "js",
      "webpack": {
        "enable": false,
        "bundles": [],
        "verbose": false
      }
    }
    ```

    Default: [Object] for apps generated with [generator-roosevelt](https://github.com/rooseveltframework/generator-roosevelt):

    ```json
    {
      "sourcePath": "js",
      "webpack": {
        "enable": true,
        "bundles": [{
          "config": {
            "entry": "${js.sourcePath}/main.js",
            "devtool": "source-map",
            "output": {
              "path": "${publicFolder}/js"
            },
            "resolve": {
              "alias": {
                "fs": false,
                "path": false
              },
              "modules": ["${js.sourcePath}", "${publicFolder}/js", "${appDir}", "node_modules"]
            }
          }
        }]
      }
    }
    ```

- `publicFolder`: All files and folders in this directory will be exposed as static files in development mode or when `hostPublic` is enabled.

  - Default: *[String]* `"public"`.

- `staticsRoot`: Relative path on filesystem to where your source static assets are located. By default this folder will not be made public, but is instead meant to store unprocessed or uncompressed source assets that will later be preprocessed and exposed in `public`.

  - Default: *[String]* `"statics"`.

- `symlinks`: *[Array]* Declare one or more symlinks to be generated at runtime.

  - `source`: *[String]* Path to be linked to.

    - Roosevelt will not attempt to generate a symlink to a source path that does not exist.

  - `dest`: *[String]* Path to place symlink.

    - If this destination path already exists it will not be overwritten.

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

- `minify`: Enables HTML and CSS minification. This feature is automatically disabled during development mode. Minification for JS files is handled by the `js` params above.

  - Default: *[Boolean]* `true`.

- `prodSourceMaps`: Enables source maps for minified CSS and JS files in production mode.

  - Default: *[Boolean]* `false`.

- `minifyHtmlAttributes`: Settings to pass to [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes).
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

- `preprocessedStaticsPath`: Relative path on filesystem to where your preprocessed static files will be written to. Preprocessed static files are view files that have been preprocessed by the [minify-html-attributes](https://github.com/rooseveltframework/minify-html-attributes) module, if you have `minifyHtmlAttributes` enabled.
  - Default: *[String]* `".preprocessed_statics"`.
  - This feature will only be active if `minifyHtmlAttributes` is enabled.

- `versionedPublic`: If set to true, Roosevelt will prepend your app's version number from `package.json` to your public folder. Versioning your public folder is useful for resetting your users' browser cache when you release a new version.

  - Default: *[Boolean]* `false`.

### Events

Roosevelt provides a series of events you can attach code to by passing a function to the desired event as a parameter to Roosevelt's constructor like so:

```js
require('roosevelt')({
  onServerStart: (app) => { /* do something */ }
})
```

### Event list

- `onBeforeMiddleware(app)`: Fired when the app begins initializing, prior to any middleware being loaded into the app.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onServerInit(app)`: Fired when the server is fully initialized and all middleware has been loaded but before the server has started.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onServerStart(app)`: Fired when the server starts.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onAppExit(app)`: Fired when the app recieves a kill signal.
  - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
- `onClientViewsProcess(template)`: Fired to preprocess templates before being exposed to the client.
  - `template`: A string containing a template written in any JS-based templating engine (e.g. Teddy, Pug, ejs, etc)

## Making model files

Place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
module.exports = () => {
  return {some: 'data'}
}
```

In more complex apps, you might query a database to get your data instead.

## Making view files

Views by default are [Teddy](https://github.com/rooseveltframework/teddy) templates. See the Teddy documentation for information about how to write Teddy templates.

You can also use different templating engines by tweaking Roosevelt's [MVC parameters](https://github.com/rooseveltframework/roosevelt#mvc-parameters).

## Making controller files

Controller files are places to write [Express routes](http://expressjs.com/api.html#app.VERB). A route is the term Express uses for URL endpoints, such as `http://yoursite/blog` or `http://yoursite/about`.

Controllers bind models and views together.

To make a new controller, make a new file in the controllers directory. For example:

```js
module.exports = (router, app) => {
  // router is an Express router
  // and app is the Express app created by Roosevelt

  // standard Express route
  router.route('/about').get((req, res) => {

    // load a data model
    let model = require('models/dataModel')()

    // render a template and pass it the model
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

## Express variables exposed by Roosevelt

Roosevelt supplies several variables to Express that you may find handy. Access them using `app.get('variableName')`.

| Express variable                     | Description                                                  |
| ------------------------------------ | ------------------------------------------------------------ |
| `express`                            | The Express module.                                          |
| `httpServer`                         | The [http server](https://nodejs.org/api/http.html#http_class_http_server) created by Roosevelt. |
| `httpsServer`                        | The [https server](https://nodejs.org/api/https.html#https_class_https_server) created by Roosevelt. |
| `router`                             | Instance of router module used by Roosevelt.                 |
| `routePrefix`                        | Prefix appended to routes via the `routePrefix` param. Will be `''` if not set. |
| `routes`                             | List of all routes in the app. |
| *viewEngine* e.g. `teddy` by default | Any view engine(s) you define will be exposed as an Express variable. For instance, the default view engine is teddy. So by default `app.get('teddy')` will return the `teddy` module. |
| `view engine`                        | Default view engine file extension, e.g. `.html`.            |
| `debugMarkup`                        | HTML you can add to your custom error pages if you define any that will print server errors if any exist, display the route list, add some inline JavaScript that will serialize the request's `err`, `req`, and `res` objects so you can interactively examine them in the browser's developer tools. Only available in development mode. |
| `expressSession`                     | The [express-session](https://github.com/expressjs/session) module Roosevelt uses internally. Session middleware. |
| `logger`                             | The [roosevelt-logger](https://github.com/rooseveltframework/roosevelt-logger) module Roosevelt uses internally. Used for console logging. |
| `modelsPath`                         | Full path on the file system to where your app's models folder is located. |
| `viewsPath` or `views`               | Full path on the file system to where your app's views folder is located. |
| `preprocessedViewsPath` or `preprocessedViews`               | Full path on the file system to where your app's preprocessed views folder is located. |
| `preprocessedStaticsPath` or `preprocessedStatics`               | Full path on the file system to where your app's preprocessed statics folder is located. |
| `controllersPath`                    | Full path on the file system to where your app's controllers folder is located. |
| `staticsRoot`                        | Full path on the file system to where your app's statics folder is located. |
| `publicFolder`                       | Full path on the file system to where your app's public folder is located. |
| `htmlPath`                           | Full path on the file system to where your app's HTML static page source files are located. |
| `cssPath`                            | Full path on the file system to where your app's CSS source files are located. |
| `jsPath`                             | Full path on the file system to where your app's JS source files are located. |
| `htmlRenderedOutput`                 | Full path on the file system to where your app's rendered and minified staic HTML files are located. |
| `cssCompiledOutput`                  | Full path on the file system to where your app's minified CSS files are located. |
| `clientControllersBundledOutput`     | Full path on the file system to where your app's client-exposed controllers folder is located. |
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
| `initServer(callback)`   | *[Method]* Starts the HTML validator, sets up some middleware, runs the CSS and JS preprocessors, and maps routes, but does not start the HTTP server. Call this method manually first instead of `startServer` if you need to setup the Express app, but still need to do additional setup before the HTTP server is started. This method is automatically called by `startServer` once per instance if it has not yet already been called. Takes an optional callback. |
| `init`                   | *[Method]* Shorthand for `initServer`. |
| `startServer`            | *[Method]* Calls the `listen` method of `http`, `https`, or both (depending on your configuration) to start the web server with Roosevelt's config. |
| `start`                  | *[Method]* Shorthand for `startServer`. |
| `stopServer(params)`     | *[Method]* Stops the server from accepting new connections before exiting and takes an optional argument `stopServer({persistProcess: true})` which will allow the process to remain active after the server has closed. |
| `stop`                   | *[Method]* Shorthand for `stopServer`. |

## Supplying your own CSS preprocessor

In addition to Roosevelt's built-in support for the LESS, Sass, and Stylus preprocessors you can also define your own preprocessor on the fly at start time in Roosevelt's constructor like so:

```js
let app = require('roosevelt')({
  cssCompiler: app => {
    return {
      versionCode: app => {
        // write code to return the version of your app here
        // generally you should return a css variable with your app version
      },
      parse: (app, filePath) => {
        // write code to preprocess CSS here
        return {
          css: 'write code to output css here',
          sourceMap: 'write code to output source map here (optional)
        }
      }
    }
  }
})
```

### API

- `cssCompiler(app)`: Custom CSS preprocessor.
  - `versionCode(app)`: Function to return the version of your app. This is needed to support the `versionFile` feature of Roosevelt's CSS preprocessor API.
    - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
  - `parse(app, fileName)`: Function to preprocess CSS.
    - `app`: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
    - `filePath`: The path to the file being preprocessed.

When a custom preprocessor is defined in this way it will override the selected preprocessor specified in `css.compiler.module`.

## Deploying Roosevelt apps

If you want to deploy a Roosevelt live to the internet, there are some things you should do to harden it appropriately if you expect to take significant traffic.

#### Use HTTPS

Setting up HTTPS can be tricky to configure properly especially for novices, so it can be tempting not do it to simplify deployment, but your website won't be seen as professional if it isn't served up via HTTPS. It's worth the effort to set it up.

#### Use a caching service or a database to store sessions

Roosevelt's default session store for `express-session` works great if your app only needs a single process, but if you're spreading your app across multiple processes or servers, you will need to reconfigure `express-session` to use a caching service that supports replication like [redis](https://en.wikipedia.org/wiki/Redis) or a database that supports replication like [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) in order to scale your app.

#### Run the app behind a reverse proxy and use all the CPU cores

To do this, use the `production-proxy-mode` command line flag and run the process on multiple cores using a tool like [pm2](https://pm2.io/docs/runtime/guide/load-balancing/).

Then host your app behind a reverse proxy from a web server like Apache or nginx, which [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).

Running the app in production-proxy mode runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only listens to requests coming from the proxy server and does not serve anything in the public folder.

You will then need to serve the contents of the public folder directly via Apache or nginx.

## Upgrading to new versions of Roosevelt

When you upgrade to a new version of Roosevelt, your Roosevelt config, npm run scripts, or other ways you use Roosevelt may need to be updated to account for breaking changes. There is a config auditor built-in to Roosevelt to detect most such issues, but not everything you might need to change is automatically detected.

Aside from the config auditor, one of the easiest ways to see what you might need to change in your app during a Roosevelt upgrade is to compare changes to the default sample app over time, [which you can view here](https://github.com/rooseveltframework/roosevelt-sample-app).

### Documentation for previous versions of Roosevelt

- *[0.24.x](https://github.com/rooseveltframework/roosevelt/blob/808198978eddc32fc588528b52ec97beb0f3eaf6/README.md)*
- *[0.23.x](https://github.com/rooseveltframework/roosevelt/blob/88a3e64cb893bfa813b0e00e2b5aea03c1be5b98/README.md)*
- *[0.22.x](https://github.com/rooseveltframework/roosevelt/blob/e76256d82ef587d31320bcd52930a5358f9f2953/README.md)*
- *[0.21.x](https://github.com/rooseveltframework/roosevelt/blob/539e11dc9ce5f4d6340762dedb1a11134fe51b04/README.md)*
- *[0.20.x](https://github.com/rooseveltframework/roosevelt/blob/430a9bf8d193b177527872602b23ef3df08a9afa/README.md)*
- *[0.19.x](https://github.com/rooseveltframework/roosevelt/blob/aa10ea86f986f624bef56aa2f02ade5b6c551e13/README.md)*
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

## Contributing to Roosevelt

Here's how to set up a development environment to hack on Roosevelt's code:

- Fork/clone this repo.

- Create or find a Roosevelt app you want to test against.
  - To make a Roosevelt app, run `npx mkroosevelt`.

- Use the `devSync.js` tool to test your fork/clone of Roosevelt against your test app.

  - To do that:

    - Run the following command:
      - Linux/Mac: `node devSync.js /path/to/roosevelt/app`.
      - Windows: `node devSync.js path:\\to\\roosevelt\\app`.

      - You can also set the path in a `ROOSEVELT_DEST_DIR` environment variable. When set, you only need to run `node devSync.js`.
        - Linux/Mac: `export ROOSEVELT_DEST_DIR=/path/to/roosevelt/app`.
        - Windows: `$env:ROOSEVELT_DEST_DIR="path:\\to\\roosevelt\\app"`.
        - Or in one command (Linux/Mac): `export ROOSEVELT_DEST_DIR=/path/to/your/roosevelt/app && node devSync.js`.

    - If you do not provide a path, running the `devSync.js` script will prompt you for one.
  - To stop the script:

      - Press: `control^ + C`.
      - Type: `stop` or `s`.

#### Troubleshooting the automated tests

If some of the automated tests fail for you when they shouldn't be, make sure you remove the `test/app` folder and kill any Node.js processes (e.g. `killall node`) before running the test suite again.

If you want to see the output from a generated test app in one of the tests, insert this block of code into the test:

```javascript
testApp.stdout.on('data', (data) => {
  console.log(data.toString())
})
```

#### Support Roosevelt's development

You can support Roosevelt's development and maintenance by [buying merch](https://curly-braces-merch.printify.me/products) or [donating](https://www.paypal.com/donate/?hosted_button_id=2L2X8GRXZCGJ6). Please note that donations are not tax-deductible. Thank you for your support!
