require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const { walk } = require('@nodelib/fs.walk/promises')

function flattenObject (obj, parent = '', res = {}, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    res[parent] = obj
    return res
  }
  if (visited.has(obj)) {
    res[parent] = '[Circular]'
    return res
  }
  visited.add(obj)
  const properties = Object.getOwnPropertyNames(obj) // get both enumerable and non-enumerable properties
  if (properties.length === 0) { // if the object is empty, we should still add it to the result
    res[parent] = {}
    return res
  }
  for (const key of properties) {
    const propName = parent ? `${parent}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) flattenObject(value, propName, res, visited)
    else res[propName] = value
  }
  return res
}

module.exports = async app => {
  const express = app.get('express')
  const router = app.get('router')
  const appName = app.get('appName')
  const logger = app.get('logger')
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')
  const prefix = params.routePrefix

  // store all routes on the `routes` express var
  function indexAllRoutes () {
    const routes = []
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        let methods = Object.keys(middleware.route.methods).join(', ').toUpperCase()
        if (Object.keys(methods).length === 0) methods = 'GET'
        routes.push({ path: middleware.route.path, methods })
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            let methods = Object.keys(handler.route.methods).join(', ').toUpperCase()
            if (Object.keys(methods).length === 0) methods = 'GET'
            routes.push({ path: handler.route.path, methods })
          }
        })
      }
    })
    app.set('routes', routes)
  }
  indexAllRoutes()

  // add features that are dev mode exclusive
  if (process.env.NODE_ENV === 'development') {
    // set debug markup for non-error requests
    app.use((req, res, next) => {
      const reqContext = flattenObject(req)
      const resContext = flattenObject(res)
      const reqContextString = JSON.stringify(reqContext)
      const resContextString = JSON.stringify(resContext)
      let debugMarkup = `
        <p>To debug, you can inspect the context of this request by opening the browser developer tools, then typing code in the JavaScript console to examine the contents of the <code>req</code> (request) and <code>res</code> (response) objects.</p>
        <script>
          const req = ${reqContextString}
          const res = ${resContextString}
        </script>`
      debugMarkup += '<p>Route list:</p><ul>'
      for (const route of req.app.get('routes')) debugMarkup += `<li>${route.path} (${route.methods})</li>`
      debugMarkup += '</ul>'
      req.app.set('debugMarkup', debugMarkup)
      next()
    })
  }

  // ensure 404 page exists
  params.errorPages.notFound = path.join(app.get('controllersPath'), params.errorPages.notFound)
  if (!fs.pathExistsSync(params.errorPages.notFound)) {
    params.errorPages.notFound = path.join(__dirname, '../defaultErrorPages/controllers/404')
  }

  // ensure 403 page exists
  params.errorPages.forbidden = path.join(app.get('controllersPath'), params.errorPages.forbidden)
  if (!fs.pathExistsSync(params.errorPages.forbidden)) {
    params.errorPages.forbidden = path.join(__dirname, '../defaultErrorPages/controllers/403')
  }

  // ensure 500 page exists
  params.errorPages.internalServerError = path.join(app.get('controllersPath'), params.errorPages.internalServerError)
  if (!fs.pathExistsSync(params.errorPages.internalServerError)) {
    params.errorPages.internalServerError = path.join(__dirname, '../defaultErrorPages/controllers/5xx')
  }

  // ensure 503 page exists
  params.errorPages.serviceUnavailable = path.join(app.get('controllersPath'), params.errorPages.serviceUnavailable)
  if (!fs.pathExistsSync(params.errorPages.serviceUnavailable)) {
    params.errorPages.serviceUnavailable = path.join(__dirname, '../defaultErrorPages/controllers/503')
  }

  // enable multipart
  if (typeof params.formidable === 'object') {
    require('./enableMultipart.js')(app)
  }

  // generate mvc directories
  if (params.makeBuildArtifacts && params.makeBuildArtifacts !== 'staticsOnly') {
    fsr.ensureDirSync(app.get('modelsPath'))
    fsr.ensureDirSync(app.get('viewsPath'))
    fsr.ensureDirSync(app.get('controllersPath'))
  }

  // map statics for developer mode
  if (params.hostPublic || app.get('env') === 'development') {
    app.use(prefix || '/', express.static(app.get('publicFolder')))
  }

  // load all controllers
  const controllersPath = path.normalize(app.get('controllersPath'))
  if (await fs.pathExists(controllersPath)) {
    try {
      for (const controllerFile of await walk(controllersPath)) {
        const controllerName = controllerFile.path
        let controller

        if (controllerName !== params.errorPages.notFound) {
          try {
            if (fs.statSync(controllerName).isFile() && path.extname(controllerName) === '.js') {
              controller = require(controllerName)

              // if the controller accepts less than one or more than two arguments, it's not defining a route
              if (controller.length > 0 && controller.length < 3) {
                await Promise.resolve(controller(router, app))
              }
            }
          } catch (e) {
            logger.error(`${appName} failed to load controller file: ${controllerName}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
            logger.error(e)
          }
        }
      }
    } catch (e) {
      logger.error(`${appName} fatal error: could not load controller files from ${app.get('controllersPath')}`)
      logger.error(e)
    }
  }

  // load 404 controller last so that it doesn't supersede the others
  try {
    require(params.errorPages.notFound)(router, app)

    // define a function to move the 404 controller (the "*" route) to the end
    function moveWildcardRouteToEnd (stack) {
      const wildcardIndex = stack.findIndex(layer => layer.route && layer.route.path === '*')
      if (wildcardIndex !== -1) {
        const [wildcardRoute] = stack.splice(wildcardIndex, 1)
        stack.push(wildcardRoute)
      }
    }

    // create a proxy to observe changes to router.stack
    const stackProxy = new Proxy(router.stack, {
      set (target, property, value) {
        target[property] = value
        moveWildcardRouteToEnd(target)
        indexAllRoutes()
        return true
      },
      deleteProperty (target, property) {
        delete target[property]
        moveWildcardRouteToEnd(target)
        indexAllRoutes()
        return true
      }
    })

    // replace router.stack with the proxy
    router.stack = stackProxy

    // note there is a simlar object located at app._router.stack with the app's routes instead of the router's routes that we're not modifying
    // this is because it seems app._router.stack routes take precedence over any routes in router.stack
  } catch (e) {
    logger.error(`${appName} failed to load 404 controller file: ${params.errorPages.notFound}. Please make sure it is coded correctly. See documentation at http://github.com/rooseveltframework/roosevelt for examples.`)
    logger.error(e)
  }

  // activate the router module
  app.use(prefix || '/', router)

  // custom error page
  app.use((err, req, res, next) => {
    logger.error(err.stack)

    // set debug markup for error requests
    if (process.env.NODE_ENV === 'development') {
      const errContext = flattenObject(err)
      const reqContext = flattenObject(req)
      const resContext = flattenObject(res)
      const errContextString = JSON.stringify(errContext)
      const reqContextString = JSON.stringify(reqContext)
      const resContextString = JSON.stringify(resContext)
      let debugMarkup = `
        <h2>This request failed because there was an error in the Express server</h2>
        <p>Error message: ${err.message}</p>
        <pre>Stack trace: ${err.stack}</pre>
        <p>To debug, you can inspect the context of this request by opening the browser developer tools, then typing code in the JavaScript console to examine the contents of the <code>err</code> (error), <code>req</code> (request), and <code>res</code> (response) objects.</p>
        <script>
          const err = ${errContextString}
          const req = ${reqContextString}
          const res = ${resContextString}
        </script>`
      debugMarkup += '<p>Route list:</p><ul>'
      for (const route of req.app.get('routes')) debugMarkup += `<li>${route.path} (${route.methods})</li>`
      debugMarkup += '</ul>'
      req.app.set('debugMarkup', debugMarkup)
    }

    require(params.errorPages.internalServerError)(app, err, req, res)
  })
}
