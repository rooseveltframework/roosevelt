// injects <script> tag containing "reload.js"
module.exports = app => {
  const reloadParams = app.get('params').frontendReload

  // check that reload is enabled and app is running in development mode
  if (app.get('env') === 'development' && reloadParams.enable) {
    app.use(require('tamper')((req, res) => {
      if (res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          const pos = body.lastIndexOf('</body>')
          body = body.substring(0, pos) + `<!-- Injected by Roosevelt for frontend reload functionality -->\n<script src='/reload${getProtocol(req.protocol)}/reload.js'></script>\n</body>` + body.substring(pos + 7)
          return body
        }
      }
    }))
  }
}

// capitalize first letter of string and return modified string
function getProtocol (protocol) {
  return protocol.charAt(0).toUpperCase() + protocol.slice(1)
}
