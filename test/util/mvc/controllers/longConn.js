module.exports = router => {
  router.route('/slow').get((req, res) => {
    const start = new Date()
    while ((new Date() - start) < 250) {
      for (let i = 0; i < 1e5;) i++
    }
    res.send('done')
  })
}
