// middleware for custom 500 page

module.exports = function (app) {
  const params = app.get('params')
  const logger = app.get('logger')(app.get('params').logging)

  // 500 internal server error page
  app.use((err, req, res, next) => {
    logger.error(err.stack)
    require(params.errorPages.internalServerError)(app, err, req, res)
  })

  return app
}
