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

- `clientModels` *[Object]*: Writes a frontend counterpart for each of your models, so an isomorphic controller can `require` the same model name on both the server and the client without you writing one by hand for every model.
  - `enable` *[Boolean]*: Whether or not to write frontend models.
  - `exposeAll` *[Boolean]*: Option to write one for every model.
  - `blocklist` *[Array of Strings]*: List of files or folders to exclude when `exposeAll` is enabled.
    - Can also be set declaratively by putting a `// roosevelt-blocklist` comment at the top of any model file.
  - `allowlist` *[Array of Strings]*: List of models to expose. When set, it is the whole list and `exposeAll` is ignored.
  - `apiRoute` *[String]*: The path the generated models post to. A model named `homepage` posts to `apiRoute` + `/homepage`.
  - `output` *[String]*: Subdirectory within `buildFolder` to write the frontend models to.

Default: *[Object]*

```javascript
{
  enable: false,
  exposeAll: false,
  blocklist: [],
  allowlist: [],
  apiRoute: '/api',
  output: 'js/models'
}
```

  - By default, client models will execute a default model: `js.sourcePath/models/_defaultModel.js`.
    - To change what **all** of your models do, edit that file.
    - To change **one** model, write your own `js.sourcePath/models/<name>.js` instead, which replaces the generated one for that model.
    - `_defaultModel` alone is called as `_defaultModel({ model, route }, ...args)`:
      - `model` is the name of the model it is standing in for, e.g. `homepage` or `admin/reports`.
      - `route` is where the default posts, e.g. `/api/homepage`. An implementation that is not HTTP ignores it and works from `model`.
      - `args` is whatever the caller passed the model. The default ignores it, because an isomorphic controller hands its models the request and response, which are not things to send over the wire.
    - A model of your own is not called that way. It replaces the generated one outright, so it is called by whatever calls the model, which for an isomorphic controller means `(req, res)`, exactly as the server side model of the same name is called. It never sees `model` or `route`, since it already knows which model it is.

The one the app generator writes, which is the starting point:

```javascript
// statics/js/models/_defaultModel.js
module.exports = async ({ model, route }) => {
  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  return response.json()
}
```

Adding a credential, a CSRF token, and error handling to every model at once:

```javascript
// statics/js/models/_defaultModel.js
module.exports = async ({ route }) => {
  const response = await fetch(route, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
    },
    body: JSON.stringify({})
  })
  if (!response.ok) throw new Error(`${route} responded ${response.status}`)
  return response.json()
}
```

Answering from a local store first and only going to the server on a miss, which uses `model` as the key and `route` for the fallback:

```javascript
// statics/js/models/_defaultModel.js
const cache = require('myIndexedDbWrapper')

module.exports = async ({ model, route }) => {
  const cached = await cache.get(model)
  if (cached) return cached

  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  const data = await response.json()
  await cache.put(model, data)
  return data
}
```

Nothing here has to be HTTP at all. A version backed by a WebSocket, some other endpoint, or data preloaded into the page can work entirely from `model` and never call `fetch`.

Replacing a single model, which bypasses `_defaultModel` for that one:

```javascript
// statics/js/models/homepage.js
module.exports = async (req, res) => {
  return { content: { hello: 'this page needs nothing from the server' } }
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

