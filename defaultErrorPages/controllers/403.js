const fs = require('fs-extra')
const path = require('path')
const template = require('../../lib/tools/templateLiteralRenderer')
const errorPage = fs.readFileSync(path.join(__dirname, '../views/403.html'))

module.exports = (app, req, res) => {
  const model = {
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: req.app.get('appVersion') ? ` ${req.app.get('appVersion')}` : ''
  }
  let errorTemplate = template(errorPage, model)
  let csrfWarning = ''
  if (req.app.get('params').csrfProtection && req.method === 'POST') csrfWarning = '<p><strong>The most common cause of this error is forgetting to include the CSRF token in the request. See <a href="https://rooseveltframework.org/docs/latest/coding-apps/#examplepostroute">example POST route</a> for more information about how to make POST requests.</strong></p>'
  if (process.env.NODE_ENV === 'development' && req.app.get('routes').length) errorTemplate = errorTemplate.replace('</footer>', `${csrfWarning}${req.app.get('debugMarkup') || ''}</footer>`)
  res.setHeader('Connection', 'close')
  res.status(403)
  res.send(errorTemplate)
}
