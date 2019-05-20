// Injects <script> tag containing "reload.js"
const tamper = require('tamper')

module.exports = function (app) {
  const reloadParams = app.get('params').frontendReload

  // check that Reload is enabled
  if (app.get('env') === 'development' && reloadParams.enabled) {
    app.use(tamper((req, res) => {
      if (res.statusCode === 200 && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          return body.replace(/<\/body>/g, `<script src='/reload${getProtocol(req.protocol)}/reload.js'></script></body>`)
        }
      }
    }))
  }

  // Capitalize first letter of string and return modified string
  function getProtocol (protocol) {
    return protocol.charAt(0).toUpperCase() + protocol.slice(1)
  }
}
