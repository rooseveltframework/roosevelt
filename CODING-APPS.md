## Making model files

Place a file named `dataModel.js` in `mvc/models`.

Here's a simple example `dataModel.js` data model:

```js
// dataModel.js
module.exports = () => {
  return { some: 'data' }
}
```

In more complex apps, you might query a database to get your data instead.

## Making view files

Views by default are [Teddy](https://rooseveltframework.org/docs/teddy) templates. See the Teddy documentation for information about how to write Teddy templates.

You can also configure Roosevelt to use any templating system supported by Express for your views.

## Making controller files

Controller files are places to write [Express routes](https://expressjs.com/en/api.html#router). A route is the term Express uses for URL endpoints, such as `https://yoursite/blog` or `https://yoursite/about`.

Controllers bind models and views together.

To make a new controller, make a new file in the controllers directory, then follow one of the examples below.

### Example route

```js
// someController.js
module.exports = (router, app) => {
  // router is an Express router
  // and app is the Express app created by Roosevelt

  // standard Express route
  router.route('/about').get((req, res) => {
    // load a data model
    const model = require('models/dataModel')()

    // render a template and pass it the model
    res.render('about', model)
  })
}
```

When writing POST routes, Roosevelt secures them by leveraging the [`Sec-Fetch-Site`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site) header. Browsers tell Roosevelt where each request came from using `Sec-Fetch-Site`, and Roosevelt refuses any request that changes data unless the browser says it came from your own site.

Anything that is not a browser does not send that header, such as a mobile app, another server, or a command line HTTP client like curl. Requests from those clients are refused for the same reason. To allow them, add their routes to `csrfProtection.exemptions`. See the The `rooseveltConfig` API configuration section for details.

### Example POST route with CSRF tokens

If you have set `csrfProtection.requireTokens` to `true`, requests that change data must also carry a CSRF token. You would want that if anything untrusted is hosted on a subdomain you share, such as user uploaded content or a separate app someone else runs, since requiring a token is the only way to stop an untrusted request coming from another subdomain of your own site.

When tokens are required, you need to pass one from the server to the browser, and then return that token when making a request from the browser to the server.

To do that, include the CSRF token in your HTML form as a hidden input `_csrf`:

```js
// someController.js
module.exports = (router, app) => {
  router.route('/form').get((req, res) => {
    const model = require('models/dataModel')()
    model.csrfToken = req.csrfToken() // add CSRF token to the model
    res.render('about', model)
  })
}
```

```html
<!-- form that include the token in a request body -->
<form action="/some-protected-endpoint" method="post">
  <input type="hidden" name="_csrf" value="{csrfToken}">
</form>
```

You can also add the token as a request header when performing fetch requests by setting the `x-csrf-token` header:

```javascript
// request that includes the token in headers
const response = await fetch('/some-protected-endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-TOKEN': csrfToken // extract it from the DOM or something
  }
})
```

Note that `req.csrfToken()` is only available when `csrfProtection.requireTokens` is set to `true`, since there are no tokens to generate otherwise.

You can also exempt certain routes from CSRF protection or disable the feature entirely by configuration. See configuration section for details.

### Reusable controllers

Sometimes it is also useful to separate controller logic from your routing. This can be done by creating a reusable controller module. Reusable controller modules differ from standard controller modules in that they are meant to be called from within other controllers and do not define routes.

To create a reusable controller, put a file in your controllers directory that accepts `app`, `req`, and `res` arguments with logic that is meant to execute from within a predefined route.

An example of when this might be needed would be having a reusable controller for "404 Not Found" pages:

```js
// notFound.js — reusable controller
module.exports = (app, req, res) => {
  const model = { content: 'Cannot find this page' }
  res.status(404)
  res.render('404', model)
}
```

You can then call the reusable controller in any other controller when needed:

```js
// someController.js
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
      require('controllers/notFound')(app, req, res)
    }
  })
}
```

Any controller file that has no arguments or more than two arguments will be considered a reusable controller.

## Making static pages

You can also generate static files from templates and models as well.

Templates for static pages go in your statics folder (`staticsRoot`) under the HTML source path (`html.sourcePath`), which is `statics/pages` by default.

Data models for the templates will be merged from different possible locations to source them from in the following order of precedence:

1. `*` model in `htmlModels`.
2. File-level override in `htmlModels`.
3. Model file.

### Setting static page models

To declare a global model in `htmlModels`, use the `*` character:

```javascript
// build.js
(async () => {
  await require('roosevelt')({
    html: {
      models: {
        '*': {
          hello: 'world!'
        }
      }
    }
  }).init()
})()
```

To declare a model for a specific file in `htmlModels`:

```javascript
// build.js
(async () => {
  await require('roosevelt')({
    html: {
      models: {
        'index.html': {
          hello: 'world!'
        }
      }
    }
  }).init()
})()
```

You can also declare a model for a specific page by placing a JS file with the same name alongside the template.

For example if an `index.js` file exists next to `index.html`, the JS file will be used to set the model so long as it exports either an object or a function that returns an object.
