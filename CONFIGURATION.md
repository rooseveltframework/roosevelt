## App name

Roosevelt will determine your app's name by examining `"name"` in `package.json`. If none is provided, it will use `Roosevelt Express` instead.

## `rooseveltConfig`

Roosevelt is highly configurable and you can configure it from the following hierarchy of sources in increasing order of precedence:

- A `roosevelt.config.js` file.
- A `rooseveltConfig.js` file.
- Constructor parameters.
- Environment variables.
- Command line flags.

What "increasing order of precedence" means is that command line flags will override environment variables, environment variables will override constructor parameters, constructor parameters will override the config file, etc.

The config file is a JavaScript file that exports your params. Here's a very simple example that sets one param:

```javascript
module.exports = {
  http: {
    port: 4000
  }
}
```

### Setting part of a param

Params that hold an object can be set a piece at a time. Anything you leave out keeps its default, so this turns off request logging without disturbing the other logging settings:

```javascript
module.exports = {
  logging: {
    methods: {
      http: false
    }
  }
}
```

Params that pass their options along to another module, such as `helmet` and `formidable`, accept any option that module takes, whether or not Roosevelt documents it.

### Referring to other params in your params

Use `ref` when you need to reference the value of another param. It takes a function that receives the finished params:

```javascript
const rooseveltConfig = require('roosevelt/config')
const path = require('path')

module.exports = {
  symlinks: [
    {
      source: rooseveltConfig.ref(param => param.js.sourcePath),
      dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js'))
    }
  ]
}
```

### The `rooseveltConfig` API

<details open>
  <summary>Configuration params</summary>
  <ul>
    <li><a href="./CONFIG-FILE-PATHS.md">File paths</a></li>
    <li><a href="./CONFIG-HTTP.md">HTTP</a></li>
    <li><a href="./CONFIG-APP-BEHAVIOR.md">App behavior</a></li>
    <li><a href="./CONFIG-STATIC-FILES.md">Static files</a></li>
    <li><a href="./CONFIG-CSS.md">CSS</a></li>
    <li><a href="./CONFIG-JS.md">JS</a></li>
    <li><a href="./CONFIG-ISOMORPHIC.md">Isomorphic (single page app)</a></li>
    <li><a href="./CONFIG-DEV-MODE.md">Development mode</a></li>
    <li><a href="./CONFIG-DEPLOYMENT.md">Deployment</a></li>
    <li><a href="./CONFIG-EVENTS.md">Events and Express variables</a></li>
    <li><a href="./CONFIG-CLI.md">Environment variables and command line usage</a></li>
  </ul>
</details>


