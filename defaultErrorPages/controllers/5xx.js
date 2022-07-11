const fs = require('fs-extra')
const path = require('path')
const template = require('es6-template-strings')
const errorPage = fs.readFileSync(path.join(__dirname, '../views/5xx.html'))

module.exports = function (app, err, req, res) {
  const status = err.status || 500
  const model = {
    status,
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('appVersion')
  }
  const errorTemplate = template(errorPage, model)

  res.status(status)
  res.send(errorTemplate)
}
