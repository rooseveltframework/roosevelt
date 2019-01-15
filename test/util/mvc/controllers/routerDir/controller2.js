module.exports = (router) => {
  router.route('/controller2').get((req, res) => {
    res.send('test')
  })
}
