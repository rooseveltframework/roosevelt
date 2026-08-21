const docsUrl = require('../../lib/tools/docsUrl')

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
  <title>403 Forbidden</title>
</head>
<body>
  <main>
    <header>
      <h1>Forbidden</h1>
    </header>
    <p>You don't have permission to access ${url} on this server.</p>
    <footer>
      <address>${mainDomain}${appVersion}</address>
    </footer>
  </main>
</body>
</html>`

  // what most likely caused the 403 depends on which csrf protections the app is using, so the advice follows the config rather than always blaming a missing token
  let csrfWarning = ''
  const csrfProtection = req.app.get('params').csrfProtection
  if (csrfProtection && req.method === 'POST') {
    if (csrfProtection.requireTokens) csrfWarning = `<p><strong>The most common cause of this error is forgetting to include the CSRF token in the request. See <a href="${docsUrl}/coding-apps/#examplepostroutewithcsrftokens">example POST route with CSRF tokens</a> for more information about how to make POST requests.</strong></p>`
    else csrfWarning = `<p><strong>The most common cause of this error is that the browser did not say the request came from this site, which is what happens with a request from another site, or from anything that is not a browser. See <a href="${docsUrl}/coding-apps/#examplepostroute">example POST route</a> for more information about how to make POST requests.</strong></p>`
  }

  if (process.env.NODE_ENV === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', `${csrfWarning}${req.app.get('debugMarkup') || ''}</footer>`)
  res.setHeader('Connection', 'close')
  res.status(403)
  res.send(errorTemplate)
}
