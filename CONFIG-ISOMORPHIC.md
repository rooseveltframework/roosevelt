# Isomorphic (single page app) options

- `clientControllers` *[Object]*: Allows you to expose controller (route) file code to frontend JS for client-side routing.
  - `enable` *[Boolean]*: Whether or not to bundle controller files.
  - `exposeAll` *[Boolean]*: Option to expose all templates.
  - `blocklist` *[Array of Strings]*: List of files or folders to exclude when `exposeAll` is enabled.
    - Can also be set declaratively by putting a `// roosevelt-blocklist` comment at the top of any controller file.
  - `allowlist` *[Object of Arrays]*: List of JS files to create mapped to which controller files to expose.
    - Example: `{ "mainPages.js": ["index.js", "about.js"] }`
    - Can also be set declaratively by putting a `// roosevelt-allowlist file_path` comment at the top of any controller file.
  - `defaultBundle` *[String]*: File name for the default JS controller bundle.
  - `output` *[String]*: Subdirectory within `buildFolder` to write JS controller bundles to.

Default: *[Object]*

```javascript
{
  enable: false,
  exposeAll: false,
  blocklist: [],
  allowlist: {},
  defaultBundle: 'controllers.js',
  output: 'js'
}
```

- `clientViews` *[Object]*: Allows you to expose view (template) file code to frontend JS for client-side templating.
  - `enable` *[Boolean]*: Whether or not to bundle view files.
  - `exposeAll` *[Boolean]*: Option to expose all templates.
  - `blocklist` *[Array of Strings]*: List of files or folders to exclude when `exposeAll` is enabled.
    - Can also be set declaratively by putting a `<!-- roosevelt-blocklist -->` tag at the top of any template.
  - `allowlist` *[Object of Arrays]*: List of JS files to create mapped to which view files to expose.
    - Example: `{ "mainPages.js": ["baseLayout.html", "footer.html"] }`
    - Can also be set declaratively by putting a `<!-- roosevelt-allowlist file_path -->` tag at the top of any template.
  - `defaultBundle` *[String]*: File name for the default JS view bundle.
  - `output` *[String]*: Subdirectory within `buildFolder` to write JS view bundles to.
  - `minify` *[Boolean]*: Option to minify templates that are exposed via this feature.
    - Be careful with this feature because it can break your templates depending on which templating system you use, and as such it is off by default. You may need to make liberal use of the `minifyOptions` param to make it work right with your templating system.
  - `minifyOptions` *[Object]*: Parameters to supply to [html-minifier](https://github.com/terser/html-minifier-terser#options-quick-reference)'s API.
    - Uses the params you set in `html.minifier.options` if empty.

Default: *[Object]*

```javascript
{
  enable: false,
  exposeAll: false,
  blocklist: [],
  allowlist: {},
  defaultBundle: 'views.js',
  output: 'js',
  minify: false,
  minifyOptions: {}
}
```

