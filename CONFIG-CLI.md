# Environment variables and command line usage

## Recognized environment variables

The following is a list of [environment variables](https://en.wikipedia.org/wiki/Environment_variable) that Roosevelt listens for.

- `NODE_ENV`:
  - Set to `production` to force the app into production mode.
  - Set to `development` to force the app into development mode.
- `NODE_PORT`: Default HTTPS port to run your app on.
  - Will set HTTP port instead if HTTPS is disabled.
- `HTTP_PORT`: Default HTTP port to run your app on. Takes precedence over `NODE_PORT`.
- `HTTPS_PORT`: Default HTTPS port to run your app on.
- `DISABLE_HTTP`: When set to `true`, the HTTP server will be disabled regardless of what is set in the `rooseveltConfig`.
- `DISABLE_HTTPS`: When set to `true`, the HTTPS server will be disabled regardless of what is set in the `rooseveltConfig`.
- `SWAP_HTTPS_TO_HTTP`: When set to `true`, the server will switch from using HTTPS to HTTP if `rooseveltConfig` is currently configured to use HTTPS.
- `MAKE_BUILD_ARTIFACTS`: Lets you set Roosevelt's `makeBuildArtifacts` param via environment variable.

Environment variable precedence:

- Environment variables supersede your app's `rooseveltConfig`.
- Environment variables can be overridden with command line arguments.

## Command line usage

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

Roosevelt also ships a few commands of its own. They are available in any app that depends on Roosevelt, so you do not need a `scripts` entry in your `package.json` to use them:

- `npx roosevelt-generate-certs`: Generates self-signed HTTPS certs for your app.
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.
  - Writes the cert and key named by your `https.options` params, so it does nothing if you have not set those.

- `npx roosevelt-generate-session-secret`: Generates a secret key for the `express-session` module.
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.

- `npx roosevelt-generate-secrets`: Runs both of the above.
  - Supports command line flags `--appDir somewhere` `--secretsPath somewhere` to override those default locations.

- `npx roosevelt-migrate-config`: Converts an old JSON config into a `roosevelt.config.js` file.
  - Takes the app directory as an argument, and uses the current directory if you do not supply one.

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

- `node app.js --jsbundler=verbose`: Prints verbose errors from the JS bundler to the console.
  - Default shorthands:
    - `--jsb=verbose`
    - `-j=verbose`

- `node app.js --jsbundler=verbose-file`: Prints verbose errors from the JS bundler to the console as well as write a jsBundlerError.txt file to the app's root directory containing the full error.
  - Default shorthands:
    - `--jsb=verbose-file`
    - `-j=verbose-file`

- `node app.js --production-proxy-mode`: Runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only listens to requests coming from localhost and does not serve anything in the public folder. This mode is useful when you want to host your app behind a reverse proxy from a web server like Apache or nginx and [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).
  - Default shorthands:
    - `--prodproxy`
    - `-x`

- `node app.js --quieter-startup`: Shows notices that repeat on every start at most once a day.
  - Default shorthands:
    - `-q`

- `node app.js --enable-validator`: Forces the HTML validator to be enabled.
  - Default shorthands:
    - `--html-validator`
    - `-h`

- `node app.js --disable-validator`: Forces the HTML validator to be disabled.
  - Default shorthands:
    - `--raw`
    - `-r`

### Overriding recognized command line flags and environment variables

You can rename the command line flags and environment variables Roosevelt listens for by passing a schema as the second argument to the Roosevelt constructor, with a `"rooseveltConfig"` section naming the params you want to change.

For example, by default, the `mode` param is set to development by `--development-mode`, `--dev`, or `-d`. To change it to `--dev-mode` or `-D` for that instead:

```javascript
const schemaOverride = {
  rooseveltConfig: { // we are overriding the Roosevelt config
    mode: { // we are overriding the mode param
      commandLineArg: {
        development: ['--dev-mode', '-D'] // these flags now set mode to development, replacing --development-mode, --dev, and -d
      }
    }
  }
}
const params = {} // set any Roosevelt parameters here
require('roosevelt')(params, schemaOverride).startServer()
```

The `mode` param has a set of flags for each value it accepts, so they are listed by value. Only the value you list is changed: after the override above, `--production-mode`, `--prod`, and `-p` still set mode to production.

Environment variables are overridden the same way, using `envVar`. By default, the `http.port` param is read from the `HTTP_PORT` environment variable. To read it from `MY_APP_PORT` instead:

```javascript
const schemaOverride = {
  rooseveltConfig: {
    http: { // we are overriding the http.port param
      port: {
        envVar: ['MY_APP_PORT'] // now read from MY_APP_PORT, replacing HTTP_PORT
      }
    }
  }
}
```

Tips:

- Once a flag or environment variable is renamed, the default no longer works. Include the default in your list if you want to keep it.
- You can also add a flag or environment variable to a param that does not have one by default, using the same syntax.
- Avoid flag names beginning with `--no-`, since the command line parser treats `--no-example` as setting `example` to false rather than as a flag named `no-example`.

### Combining npm scripts and command line arguments

The npm scripts can be combined with the command line flags.

For example, running `npm run dev -- --disable-validator` will run your app in development mode and force the HTML validator to be disabled.
