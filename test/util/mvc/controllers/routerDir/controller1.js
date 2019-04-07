module.exports = (router) => {
  router.route('/controller1').get((req, res) => {
    res.send('test')
  })
}
