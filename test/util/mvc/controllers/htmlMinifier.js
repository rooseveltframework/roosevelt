module.exports = router => {
  const model = require(`models/teddyModel`)

  router.route('/minify').get((req, res) => {
    res.render('teddyTest', model)
  })

  router.route('/anotherRoute').get((req, res) => {
    res.render('teddyTest', model)
  })

  router.route('/callbackRoute').get((req, res) => {
    res.render('teddyTest', model, (err, html) => {
      if (err) {
        console.error(err)
      } else {
        res.send(html)
      }
    })
  })
}
