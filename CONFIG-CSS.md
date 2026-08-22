# CSS options

- `css` *[Object]*: How you want Roosevelt to configure your CSS preprocessor:
  - `sourcePath` *[String]*: Subdirectory within `staticsRoot` where your CSS files are located. This folder is not made public. When a preprocessor is enabled, the files here are compiled, minified, and written to the `public` folder when the app starts. When one is not, see [shipping CSS without a preprocessor](#shipping-css-without-a-preprocessor) below.
  - `compiler` *[Object]*: Which CSS preprocessor (if any) to use.
    - `enable` *[Boolean]*: Whether or not to use a preprocessor.
    - `module` *[String]*: Node module name of the CSS preprocessor you wish to use.
      - Currently [less](http://lesscss.org/), [sass](https://sass-lang.com/), and [stylus](http://stylus-lang.com/) are supported.
      - Your chosen CSS preprocessor module must also be marked as a dependency in your app's `package.json`.
    - `options` *[Object]*: Parameters to send to the CSS preprocessor if it accepts any.
  - `minifier` *[Object]*: Params pertaining to CSS minifcation.
    - `enable` *[Boolean]*: Whether or not to minify CSS. Can also be disabled by the `minify` param.
    - `options` *[Object]*: Parameters to pass to the CSS minifier [clean-css](https://www.npmjs.com/package/clean-css), a list of which can be found in the [clean-css docs](https://github.com/jakubpawlowicz/clean-css#constructor-options).
  - `allowlist` *[Array of Strings]*: List of CSS files to allow for compiling. Leave undefined to compile all files. Supply a `:` character after each file name to delimit an alternate file path and/or file name for the minified file.
    - Example array member: `"example.less:example.min.css"` compiles `example.less` into `example.min.css`.
  - `output` *[String]*: Subdirectory within `publicFolder` where compiled CSS files will be written to.
  - `versionFile` *[Object]*: If enabled, Roosevelt will create a CSS file which declares a CSS variable containing your app's version number from `package.json`. Enable this option by supplying an object with the member variables `fileName` and `varName`. Versioning your static files is useful for resetting your users' browser cache when you release a new version of your app.
    - Example usage (with SASS): `{ "fileName": "_version.scss", "varName": "appVersion" }`
      - Assuming the default Roosevelt configuration otherwise, this will result in a file `statics/css/_version.scss` with the following content: `/* do not edit; generated automatically by Roosevelt */ $appVersion: '0.1.0';`
    - Some things to note:
      - If there is already a file there with that name, this will overwrite it, so be careful!
      - It's generally a good idea to add this file to .gitignore, since it is a build artifact.

Default: *[Object]*

```javascript
{
  sourcePath: 'css',
  compiler: {
    enable: false,
    module: 'less',
    options: {}
  },
  minifier: {
    enable: true,
    options: {}
  },
  allowlist: null,
  output: 'css',
  versionFile: null
}
```

- `cssCompiler` *[Function]*: Use this param to supply a custom CSS preprocessor function.
  - To do so, supply a function which accepts argument `app`, which is a reference to the [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
  - The function should return an object with the following members:
    - `versionCode(app)` *[Function]*: Function to return the version of your app. This is needed to support the `versionFile` feature of Roosevelt's CSS preprocessor API.
      - `app` *[Object]*: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
    - `parse(app, fileName)` *[Function]*: Function to preprocess CSS.
      - `app` *[Object]*: The [Express app](http://expressjs.com/api.html#express) created by Roosevelt.
      - `filePath` *[String]*: The path to the file being preprocessed.
  - When a custom preprocessor is defined in this way it will override the selected preprocessor specified in `css.compiler.module`.

This param can only set via Roosevelt's constructor, like this:

```js
(async () => {
  await require('roosevelt')({
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
            sourceMap: 'write code to output source map here (optional)'
          }
        }
      }
    }
  }).startServer()
})()
```

## Shipping CSS without a preprocessor

Preprocessing is off by default, so an app that writes plain CSS and loads it with `<link>` tags does not need to switch anything off. It only needs its CSS to reach the public folder, which either `symlinks` or `copy` will do:

```javascript
{
  symlinks: [
    {
      source: rooseveltConfig.ref(param => param.css.sourcePath),
      dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'css'))
    }
  ]
}
```

A file at `statics/css/main.css` is then served at `/css/main.css`. Use `copy` instead of `symlinks` if you would rather have real files, which also avoids needing permission to create symlinks on Windows:

```javascript
{
  copy: [
    {
      source: 'statics/css',
      dest: 'public/css'
    }
  ]
}
```

Note that Roosevelt minifies CSS as part of preprocessing it, so an app with no preprocessor ships its CSS as written. The `minify` and `css.minifier` params have nothing to act on, since nothing is reading your CSS on the way to the public folder. They still cover your HTML either way. If you want minified CSS without writing any preprocessor syntax, enabling a preprocessor is still the way to get it: Less and Sass both accept plain CSS as valid input, so you can turn one on without changing a single stylesheet.
