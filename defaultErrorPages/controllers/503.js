module.exports = (app, req, res) => {
  const url = req.url
  const mainDomain = req.headers['x-forwarded-host'] || req.headers.host
  const appVersion = req.app.get('appVersion') ? ` ${req.app.get('appVersion')}` : ''
  let errorTemplate = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <meta name='format-detection' content='telephone=no'>
  <title>503 Service Unavailable</title>
</head>
<body>
  <main>
    <header>
      <h1>503 Service Unavailable</h1>
    </header>
    <p>The requested URL ${url} is temporarily unavailable at this time.</p>
    <footer>
      <address>${mainDomain}${appVersion}</address>
    </footer>
  </main>
</body>
</html>`
  if (process.env.NODE_ENV === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', `${req.app.get('debugMarkup') || ''}</footer>`)
  res.setHeader('Connection', 'close')
  res.status(503)
  res.send(errorTemplate)
}
