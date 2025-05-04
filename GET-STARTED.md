## Prerequisites

[![npm](https://img.shields.io/npm/v/roosevelt-logger.svg)](https://www.npmjs.com/package/roosevelt) 🧸 **roosevelt**

First you will need to install [Node.js](http://nodejs.org). Both the current and LTS version of Node.js are supported. It is recommended that you have both the current and LTS versions of Node.js installed on your system. To do that, it is recommended that you install Node.js using a Node.js version manager like [nvm](https://github.com/creationix/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) rather than the official installer, as a version manager will allow you to switch between multiple versions of Node.js easily.

## Make a Roosevelt app

[![npm](https://img.shields.io/npm/v/roosevelt-logger.svg)](https://www.npmjs.com/package/mkroosevelt) 🏭🧸 **mkroosevelt**

The simplest way to make a Roosevelt app is to simply run the following command:

```bash
npx mkroosevelt
```

Then follow the prompts to decide whether to make a multi-page app, static site generator, or a single page app.

### Other ways to make Roosevelt apps

[![npm](https://img.shields.io/npm/v/roosevelt-logger.svg)](https://www.npmjs.com/package/generator-roosevelt) 🏭🧸 **generator-roosevelt**

What the `mkroosevelt` command does under the hood is call the [Roosevelt app generator](https://github.com/rooseveltframework/generator-roosevelt), a command line script based on [Yeoman](http://yeoman.io), to create a sample Roosevelt app for you. You could also install the app generator to your system if you like. To do that, first globally install Yeoman and the Yeoman-based Roosevelt app generator:

```bash
npm i -g yo generator-roosevelt
```

Then create a Roosevelt app using the Roosevelt app generator:

```bash
yo roosevelt
```

Then follow the prompts.

### Create a Roosevelt app manually

It is also possible to create a Roosevelt app without using the app generator. This will result in a more minimalist default configuration (e.g. no CSS or JS preprocessors enabled by default).

To do that:

- First create a new folder and `cd` into it.
- Then `npm i roosevelt`. This will create a `node_modules` folder with Roosevelt and its bare minimum dependencies.
- Create a file named `app.js`.
- Put this code in `app.js`:
```javascript
(async () => {
  await require('roosevelt')({
    makeBuildArtifacts: true
  }).startServer()
})()
```

- Then `node app.js`. If the `makeBuildArtifacts` parameter is set to true like the above code example, an entire Roosevelt app with bare minimum viability will be created and the server will be started.

## Default directory structure

Below is the default directory structure for an app created using the Roosevelt app generator.

### Application logic

- `app.js` or `build.js`: Entry point to your application. Feel free to rename this, but make sure to update `package.json`'s references to it. It defaults to `app.js` when building a multi-page app or a single page app. It defaults to `build.js` when building a static site generator.
- `lib`: A folder for any includable JS files that don't belong in any of the other directories. It has been added to the `require` stack so you can simply `require('lib/someFile')`.
- `mvc`: Folder for models, views, and controllers.
  - `controllers`: Folder for controller files; the "C" in MVC. This is where your HTTP routes will go.
  - `models`: Folder for model files; the "M" in MVC. This is where you will get data to display in your views e.g. by querying a database or do other business logic.
  - `views`: Folder for view files; the "V" in MVC. This is where your HTML templates will go.

### Static files

- `statics`: Folder for source CSS, image, JS, and other static files. By default some of the contents of this folder are symlinked to the public folder, which you can configure via params.
  - `css`: Folder for source CSS files.
  - `images`: Folder for source image files.
  - `js`: Folder for source frontend JS files.
  - `pages`: Folder for HTML templates that get rendered as static pages and deposited into the public folder.

### Build artifacts

- `.build`: Folder for build artifacts.
  - `preprocessed_statics`: Static files that have been preprocessed by the [minify-html-attributes](https://rooseveltframework.org/docs/minify-html-attributes) module, if you have `minifyHtmlAttributes` enabled.
  - `preprocessed_views`: View files that have had their uses of web components progressively enhanced using the [progressively-enhance-web-components](https://rooseveltframework.org/docs/progressively-enhance-web-components) module and/or preprocessed by the [minify-html-attributes](https://rooseveltframework.org/docs/minify-html-attributes) module, if you have `minifyHtmlAttributes` enabled.
  - The output JS files from the `clientControllers` or `clientViews` features.
- `public`: All contents within this folder will be exposed as static files. For the most part, the contents of this folder will be populated from the statics folder. This folder is added to `.gitignore` by default because it is considered a build artifact.

### Application infrastructure

- `.gitignore`: A standard file which contains a list of files and folders to ignore if your project is in a [git](https://git-scm.com/) repo. Delete it if you're not using git. The default `.gitignore` file contains many common important things to ignore, however you may need to tweak it to your liking before committing a fresh Roosevelt app to your git repo.
- `node_modules`: A standard folder created by Node.js where all modules your app depends on (such as Roosevelt) are installed to. This folder is created when installing dependencies using the `npm i` command. It is added to `.gitignore` by default because it is considered a build artifact.
- `package.json`: A file common to most Node.js apps for configuring your app.
- `package-lock.json`: An auto-generated file common to most Node.js apps containing a map of your dependency tree. This is created after you run `npm i` for the first time. Once the file exists within your project, you can run `npm ci` instead of `npm i` when installing dependencies, which will be more performant and will result in reproducible builds that always have the same versions of every dependency, including downstream dependencies.
- `rooseveltConfig.json`: Where your Roosevelt config is stored and what your params are set to. These values can be overridden when calling Roosevelt's constructor.
- `secrets`: A folder for "secret" files, e.g. session keys, HTTPS certs, passwords, etc. It is added to `.gitignore` by default because it contains sensitive information, so it should not be committed to git.
