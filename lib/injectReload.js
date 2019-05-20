// Injects <script> tag containing "reload.js"
const tamper = require('tamper')

module.exports = function (app) {
  const reloadParams = app.get('params').frontendReload
  const minifyParams = app.get('params').htmlMinifier

  // check that Reload is enabled
  if (reloadParams.enabled) {
    app.use(tamper((req, res) => {
      if (res.statusCode === 200 && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return (body) => {
          if (app.get('params').minify && minifyParams.enable) {
            return body.replace(/<\/body>/g, `<script src=/reload${getProtocol(req.protocol)}/reload.js></script></body>`)
          } else {
            return body.replace(/<\/body>/g, `<script src='/reload${getProtocol(req.protocol)}/reload.js'></script></body>`)
          }
        }
      }
    }))
  }

  // Capitalize first letter of string and return modified string
  function getProtocol (protocol) {
    return protocol.charAt(0).toUpperCase() + protocol.slice(1)
  }
}
