module.exports = (app, err, req, res) => {
  const status = err.status || 500
  const url = req.url
  const mainDomain = req.headers['x-forwarded-host'] || req.headers.host
  const appVersion = req.app.get('appVersion') ? ` ${req.app.get('appVersion')}` : ''
  let errorTemplate = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <meta name='format-detection' content='telephone=no'>
  <title>${status} Internal Server Error</title>
</head>
<body>
  <main>
    <header>
      <h1>${status} Internal Server Error</h1>
    </header>
    <p>The requested URL ${url} is temporarily unavailable at this time.</p>
    <footer>
      <address>${mainDomain}${appVersion}</address>
    </footer>
  </main>
</body>
</html>`
  if (process.env.NODE_ENV === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', `${req.app.get('debugMarkup') || ''}</footer>`)
  res.status(status)
  res.send(errorTemplate)
}
