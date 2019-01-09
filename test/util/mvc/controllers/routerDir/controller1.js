module.exports = (app) => {
  app.route('/controller1').get((req, res) => {
    res.send('test')
  })
}
