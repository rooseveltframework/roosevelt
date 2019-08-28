const fse = require('fs-extra')
const path = require('path')
const template = require('es6-template-strings')
const errorPage = fse.readFileSync(path.join(__dirname, '../views/503.html'))

module.exports = function (app, req, res) {
  const model = {
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('appVersion')
  }
  const errorTemplate = template(errorPage, model)

  res.setHeader('Connection', 'close')
  res.status(503)
  res.send(errorTemplate)
}
