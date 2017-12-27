const fs = require('fs')
const path = require('path')
const template = require('es6-template-strings')

module.exports = function (app, req, res) {
  let model = {
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('package').version
  }
  let errorTemplate = template(fs.readFileSync(path.join(__dirname, '../views/503.html')), model)

  res.setHeader('Connection', 'close')
  res.status(503)
  res.send(errorTemplate)
}
