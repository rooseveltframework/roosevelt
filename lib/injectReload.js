// Injects <script> tag containing "reload.js"
module.exports = function (app) {
  const reloadParams = app.get('params').frontendReload

  // check that Reload is enabled and app is running in development mode
  if (app.get('env') === 'development' && reloadParams.enable) {
    app.use(require('tamper')((req, res) => {
      if (res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
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
