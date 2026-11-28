const { STATUS_CODES } = require('http')
const escapeHtml = require('../../lib/tools/escapeHtml')
module.exports = (app, err, req, res) => {
  // the status the error carries, as express and its body parsers set it, so that a request the client got wrong, such as one with a body too large to accept, is not reported as a fault on the server. anything that is not an error status is reported as a 500
  const errStatus = err?.status ?? err?.statusCode
  const status = Number.isInteger(errStatus) && errStatus >= 400 && errStatus <= 599 ? errStatus : 500
  const title = `${status} ${STATUS_CODES[status] || (status < 500 ? 'Client Error' : 'Server Error')}`
  const url = escapeHtml(req.url)
  const explanation = status < 500 ? `The request for the URL ${url} could not be completed.` : `The requested URL ${url} is temporarily unavailable at this time.`
  const mainDomain = escapeHtml(req.headers['x-forwarded-host'] || req.headers.host)
  const appVersion = req.app.get('appVersion') ? ` ${escapeHtml(req.app.get('appVersion'))}` : ''
  let errorTemplate = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <meta name='format-detection' content='telephone=no'>
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <p>${explanation}</p>
    <footer>
      <address>${mainDomain}${appVersion}</address>
    </footer>
  </main>
</body>
</html>`
  if (req.app.get('env') === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', () => `${res.locals.debugMarkup || ''}</footer>`)
  res.status(status)
  res.send(errorTemplate)
}
