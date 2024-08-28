// Injects <script> tag containing "reload.js"

const minimatch = require('minimatch')

module.exports = function (app) {
  const reloadParams = app.get('params').frontendReload

  // check that Reload is enabled and app is running in development mode
  if (app.get('env') === 'development' && reloadParams.enable) {
    app.use(require('tamper')((req, res) => {
      // Check to make sure requested URL isn't the exclude routes configured and if type HTML append the reload frontend script
      if (!matchUrlPatterns(req.url, reloadParams.excludeRoutes) && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          const pos = body.lastIndexOf('</body>')
          body = body.substring(0, pos) + `<!-- Injected by Roosevelt for frontend reload functionality -->\n<script src='/reload${getProtocol(req.protocol)}/reload.js'></script>\n</body>` + body.substring(pos + 7)
          return body
        }
      }
    }))
  }

  // Capitalize first letter of string and return modified string
  function getProtocol (protocol) {
    return protocol.charAt(0).toUpperCase() + protocol.slice(1)
  }

  function matchUrlPatterns (url, patterns) {
    return patterns.some(pattern => minimatch(url, pattern))
  }
}
