# JS options

- `js` *[Object]*: How you want Roosevelt to handle module bundling your frontend JS:
  - `sourcePath` *[String]*: Subdirectory within `staticsRoot` where your JS files are located. By default this folder will not be made public, but is instead meant to store unbundled JS source files which will be bundled and written to the `public` folder when the app is started.
  - `bundler` *[Object]*: Which JS bundler (if any) to use.
    - `enable` *[Boolean]*: Whether or not to use a bundler.
    - `module` *[String]*: Node module name of the JS bundler you wish to use.
      - Currently [webpack](https://webpack.js.org/), [rspack](https://rspack.dev/), [esbuild](https://esbuild.github.io/), and [rollup](https://rollupjs.org/) are supported.
      - Your chosen JS bundler module must also be marked as a dependency in your app's `package.json`. Roosevelt does not install one for you, the same as with CSS preprocessors.
  - `bundles`: *[Array of Objects]* Declare one or more JavaScript bundle files.
    - `env`: *[String]* Bundle only in development or production mode.
      - Accepted values:
        - `"development"`: Development mode.
        - `"production"`: Production mode.
        - If no value is set, it will bundle in both modes.
    - `config`: *[Object or String]* The config to send to your bundler, in whatever format that bundler expects. Can also be a path to a config file relative to the app directory.
  - `customBundlerFunction`: *[Function]* An async function to run instead of one of the bundlers above. Supply this if you want to use a bundler Roosevelt does not support natively.
    - Arguments provided:
      - `bundle`: The bundle object supplied by Roosevelt.
      - `config`: The config object after it has been postprocessed by Roosevelt.
      - `app`: The Roosevelt app.
    - Return an object with `outputs` and `sources` (arrays of file paths it wrote and read) and Roosevelt will skip the bundle on the next start when none of those files changed. Return nothing and it will bundle every time.
  - `verbose` *[String]*: Enable verbose error handling.
    - Accepted values:
      - `true`: Will print verbose logs to the console.
      - `"file"`: Will print verbose logs to the console and write them to a file for debugging.

Default when an app is created manually: *[Object]*

```javascript
{
  sourcePath: 'js',
  bundler: {
    enable: false,
    module: 'webpack'
  },
  bundles: [],
  customBundlerFunction: null,
  verbose: false
}
```

Default when an app is created with the app generator: *[Object]*

```javascript
{
  sourcePath: 'js',
  bundler: {
    enable: true,
    module: 'webpack'
  },
  bundles: [
    {
      config: {
        entry: rooseveltConfig.ref(param => path.join(param.js.sourcePath, 'main.js')),
        output: {
          path: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js'))
        }
      }
    }
  ],
  customBundlerFunction: null,
  verbose: false
}
```

If you're using webpack or rspack, Roosevelt will also postprocess your config to do the following things:

- If your config does not set `mode`, then Roosevelt will set `mode` to `development` if Roosevelt is in development mode.
- If your config does not set `devtool`, then Roosevelt will set `devtool` to `source-map` if Roosevelt is in development mode.
- If Roosevelt's `prodSourceMaps` feature is enabled, then Roosevelt will set `devtool` to `source-map` if Roosevelt is in production mode.

If you're using esbuild or rollup, Roosevelt will enable source maps in development mode, and enable them in production mode when `prodSourceMaps` is set. It will also switch esbuild's minifier on outside of development mode. Set any of those yourself in your config and Roosevelt will leave your choice alone.

### Which bundlers minify your production build

Minifying is the bundler's job rather than Roosevelt's, and the four supported bundlers do not all handle it the same way:

- **webpack** and **rspack** minify in production without being asked. Roosevelt only sets their `mode` to `development` when your app is in development mode, so in production they fall back to their own default of `production`, which turns their built-in minifier on. You do not need a minifier plugin, and you do not need `terser-webpack-plugin`.
- **esbuild** minifies because Roosevelt switches its `minify` option on outside development mode.
- **rollup** does not minify at all unless you add a plugin, because it has no minifier of its own. Without one your production bundle ships as written. Add [@rollup/plugin-terser](https://www.npmjs.com/package/@rollup/plugin-terser) to your bundle's `plugins` if you want it minified.

In every case, setting the option yourself leaves your choice alone.

## Shipping frontend JS without a bundler

Bundling is off by default, so an app that writes plain JS and loads it with `<script>` tags does not need to switch anything off. It only needs its JS to reach the public folder, which either `symlinks` or `copy` will do:

```javascript
{
  symlinks: [
    {
      source: rooseveltConfig.ref(param => param.js.sourcePath),
      dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js'))
    }
  ]
}
```

A file at `statics/js/main.js` is then served at `/js/main.js`. Use `copy` instead of `symlinks` if you would rather have real files, which also avoids needing permission to create symlinks on Windows:

```javascript
{
  copy: [
    {
      source: 'statics/js',
      dest: 'public/js'
    }
  ]
}
```

Note that Roosevelt does not minify JS on its own. Minifying JS is the bundler's job, so an app with no bundler ships its JS as written. The `minify` param has nothing to do with JS: it covers HTML, and CSS when a preprocessor is enabled.

