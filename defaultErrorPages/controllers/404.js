const expressVersion = require('../../lib/tools/expressVersion')

module.exports = app => {
  app.route(expressVersion >= 5 ? '*all' : '*').all(function (req, res) {
    const url = req.url
    const mainDomain = req.headers['x-forwarded-host'] || req.headers.host
    const appVersion = req.app.get('appVersion') ? ` ${req.app.get('appVersion')}` : ''
    let errorTemplate = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <meta name='format-detection' content='telephone=no'>
  <title>404 Not Found</title>
</head>
<body>
  <main>
    <header>
      <h1>Not Found</h1>
    </header>
    <p>The requested URL ${url} was not found on this server.</p>
    <footer>
      <address>${mainDomain}${appVersion}</address>
    </footer>
  </main>
</body>
</html>`
    if (process.env.NODE_ENV === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', `${req.app.get('debugMarkup') || ''}</footer>`)
    res.status(404)
    res.send(errorTemplate)
  })
}
