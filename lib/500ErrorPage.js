// middleware for custom 500 page

module.exports = function (app) {
  const params = app.get('params')
  const logger = require('./tools/logger')(app)

  // 500 internal server error page
  app.use(function (err, req, res, next) {
    logger.error(err.stack)
    require(params.error5xx)(app, err, req, res)
  })

  return app
}
