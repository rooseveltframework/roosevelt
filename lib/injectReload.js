const wildcardMatch = require('./tools/wildcardMatch')

// injects <script> tag containing "reload.js"
module.exports = app => {
  const reloadParams = app.get('params').frontendReload

  // check that reload is enabled and app is running in development mode
  if (app.get('env') === 'development' && reloadParams.enable) {
    app.use(require('tamper')((req, res) => {
      if (!wildcardMatch(req.url, reloadParams.exceptionRoutes) && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          const pos = body.lastIndexOf('</body>')
          if (pos > 0) body = body.substring(0, pos) + `<!-- Injected by Roosevelt for frontend reload functionality -->\n<script src="${reloadParams?.expressBrowserReloadParams?.route ? reloadParams?.expressBrowserReloadParams?.route : '/express-browser-reload.js'}"></script>\n</body>` + body.substring(pos + 7)
          return body
        }
      }
    }))
  }
}
