module.exports = (app) => {
  app.route('/controller2').get((req, res) => {
    res.send('test')
  })
}
