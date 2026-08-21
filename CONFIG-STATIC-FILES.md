# Static file options

- `copy` *[Array of Objects]*: Declare one or more files or folders to copy at runtime. Default: `[]`.
  - `source` *[String]*: Path to be copied from.
    - Roosevelt will not attempt to copy files or folders that do not exist.
  - `dest` *[String]*: Path to place the copy.
    - If this destination path already exists **it will be overwritten**.

- `html` *[Object]*: Generate static HTML pages:
  - `sourcePath` *[String]*: Subdirectory within `staticsRoot` where your static HTML files are located. By default this folder will not be made public, but is instead meant to store unminified / unprocessed HTML template source files which will be rendered by your templating system, minified, and written to the `public` folder when the app is started.
  - `allowlist`: *[Array of Strings]* List of templates to render, minify, and write to the `public` folder when the app is started. If the list is empty, all templates in your `sourcePath` will be sourced. Supports wildcard matching, e.g. `dir/*`.
  - `blocklist`: *[Array of Strings]* List of templates in your `sourcePath` to skip. Supports wildcard matching, e.g. `dir/*`.
    - You can also block a file from being exposed by adding a comment on the first line of the file with the string `roosevelt-blocklist` anywhere on the line.
  - `models` *[Object]*: Data to pass to templates by file path / file name.
    - Example: `{ "index.html": { "some": "data" } }`
    - You can also pass a global model using a `*` catch-all character: `{ "*": { "some": "data" } }`
    - If this data is not supplied by configuration, Roosevelt will try to automatically load a model from a JS file with the same name alongside the template if it exists instead. For example if an index.js file exists next to index.html and the model is not defined by configuration like in the example above, then the index.js file will be used to set the model so long as it exports either an object or a function that returns an object.
  - `output` *[String]*: Subdirectory within `publicFolder` where parsed and minified HTML files will be written to.
  - `folderPerPage` *[Boolean or String]*: Make a folder for each page and place the page within it.
    - Example values:
      - `true`: Given a page called example.html, this feature will create a folder called "example" in the public folder and place "example.html" within it.
      - `"index.html"`: Given a page called example.html, this feature will create a folder called "example" in the public folder and place "index.html" within it. This is useful for creating "pretty URLs" with static sites.
      - `false`: Disables the feature.
  - `minifier` *[Object]*: How you want Roosevelt to minify your HTML:
    - `enable` *[Boolean]*: Whether or not to minify HTML.
      - Can also be disabled by the `minify` param.
      - Minification is automatically disabled in development mode.
    - `exceptionRoutes` *[Array of Strings]*: List of controller routes that will skip minification entirely. Set to `false` to minify all URLs.
    - `options` *[Object]*: Parameters to supply to [html-minifier](https://github.com/kangax/html-minifier#options-quick-reference)'s API.

Default: *[Object]*

```javascript
{
  sourcePath: 'pages',
  allowlist: null,
  blocklist: null,
  models: {},
  output: '',
  folderPerPage: false,
  minifier: {
    enable: true,
    exceptionRoutes: false,
    options: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true
    }
  }
}
```

- `favicon` *[String]*: Location of your [favicon](https://en.wikipedia.org/wiki/Favicon) file. Default: `"none"`.
  - Will be set to `"images/favicon.ico"` in apps generated with the app generator.

- `minify` *[Boolean]*: Enables HTML and CSS minification. This feature is automatically disabled during development mode. Minifying JS is handled by whichever bundler you choose in the [JS options](./CONFIG-JS.md), if any. Default: `true`.

- `minifyHtmlAttributes` *[Object]*: Settings to pass to [minify-html-attributes](https://rooseveltframework.org/docs/minify-html-attributes).
  - `enable` *[Boolean or String]*: Whether or not to enable `minify-html-attributes`.
    - Available options:
      - `"production"`: Enable only in production mode.
      - `"development"`: Enable in all modes.
      - `true`: Will be taken to mean `"production"`.
  - `minifyHtmlAttributesParams`: Params to pass to `minify-html-attributes`.
    - Note: Roosevelt will always override 3 params from `minify-html-attributes`:
      - `htmlDir` will always be set to Roosevelt's `preprocessedViewsPath`.
      - `cssDir` will always be set to Roosevelt's `preprocessedStaticsPath`.
      - `jsDir` will always be set to Roosevelt's `preprocessedStaticsPath`.

Default: *[Object]*

```javascript
{
  enable: false,
  minifyHtmlAttributesParams: {}
}
```

- `prodSourceMaps` *[Boolean]*: Enables source maps for minified CSS and JS files in production mode. Default: `false`.

- `symlinks` *[Array of Objects]*: Declare one or more symlinks to be generated at runtime. Default: `[]`.
  - `source` *[String]*: Path to be linked to.
    - Roosevelt will not attempt to generate a symlink to a source path that does not exist.
  - `dest` *[String]*: Path to place symlink.
    - If this destination path already exists it will not be overwritten.

Will be set to the following in apps generated with the app generator:

```javascript
[
  {
    source: rooseveltConfig.ref(param => path.join(param.staticsRoot, 'images')),
    dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'images'))
  }
]
```

- `versionedPublic` *[Boolean]*: If set to true, Roosevelt will prepend your app's version number from `package.json` to your public folder. Versioning your public folder is useful for resetting your users' browser cache when you release a new version. Default: `false`.

