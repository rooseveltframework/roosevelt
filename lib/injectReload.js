const wildcardMatch = require('./tools/wildcardMatch')

// injects <script> tag containing "reload.js"
module.exports = app => {
  const params = app.get('params')
  const reloadParams = params.frontendReload

  // check that reload is enabled and app is running in development mode
  if (app.get('env') === 'development' && reloadParams.enable) {
    // the reload route is added to the router, which is mounted at the route prefix, so the script has to be asked for there too
    const scriptSrc = `${params.routePrefix || ''}${reloadParams?.expressBrowserReloadParams?.route || '/express-browser-reload.js'}`

    // a list that is not one, such as false or null, excludes nothing
    const exceptionRoutes = (Array.isArray(reloadParams.exceptionRoutes) ? reloadParams.exceptionRoutes : [reloadParams.exceptionRoutes]).filter(route => typeof route === 'string')

    app.use(require('./tools/captureResponseBody')((req, res) => {
      // matched against the path the browser asked for, without its query string, because this runs once the response is written, and req.url by then can be the one a router mounted at the route prefix saw, with the prefix taken off
      const requestPath = req.originalUrl.split('?')[0]
      if (!wildcardMatch(requestPath, exceptionRoutes) && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          const pos = body.lastIndexOf('</body>')
          if (pos > 0) body = body.substring(0, pos) + `<script src="${scriptSrc}"></script> <!-- Injected by Roosevelt for frontend reload functionality -->\n</body>` + body.substring(pos + 7)
          return body
        }
      }
    }))
  }
}
