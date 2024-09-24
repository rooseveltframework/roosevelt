const fs = require('fs-extra')
const path = require('path')
const template = require('../../lib/tools/templateLiteralRenderer')
const errorPage = fs.readFileSync(path.join(__dirname, '../views/404.html'))

module.exports = app => {
  app.route('*').all(function (req, res) {
    const model = {
      url: req.url,
      mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
      appVersion: app.get('appVersion')
    }
    const errorTemplate = template(errorPage, model)

    res.status(404)
    res.send(errorTemplate)
  })
}
