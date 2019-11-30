module.exports = function (app) {
  app.route('/disableValidator').post(function (req, res) {
    const params = app.get('params')
    params.htmlValidator.enable = false
    app.set('params', params)
    res.redirect('/')
  })
}
