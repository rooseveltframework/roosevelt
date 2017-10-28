const path = require('path')

module.exports = function (app, err, req, res) {
  let status = err.status || 500
  res.status(status)
  res.render(path.join(__dirname, '/../views/5xx'), {
    status: status,
    url: req.url,
    mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
    appVersion: app.get('package').version
  })
}
