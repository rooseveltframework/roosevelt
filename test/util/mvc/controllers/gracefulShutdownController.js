module.exports = router => {
  router.route('/longWait').get((req, res) => {
    setTimeout(() => {
      res.send('longWait done')
    }, 1000)
  })
}
