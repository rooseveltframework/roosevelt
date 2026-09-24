module.exports = router => {
  const model = require('models/teddyModel')

  router.route('/minify').get((req, res) => {
    res.render('teddyTest', model)
  })

  router.route('/anotherRoute').get((req, res) => {
    res.render('teddyTest', model)
  })

  router.route('/missingView').get((req, res) => {
    res.render('aViewThatDoesNotExist', model)
  })

  router.route('/callbackWithoutOptions').get((req, res) => {
    res.render('teddyTest', (err, html) => {
      if (err) res.status(500).send('render failed')
      else res.send(html)
    })
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
