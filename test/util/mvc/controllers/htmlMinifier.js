module.exports = app => {
  const model = require(`models/teddyModel`)

  app.route('/minify').get((req, res) => {
    res.render('teddyTest', model)
  })

  app.route('/anotherRoute').get((req, res) => {
    res.render('teddyTest', model)
  })

  app.route('/callbackRoute').get((req, res) => {
    res.render('teddyTest', model, (err, html) => {
      if (err) {
        console.error(err)
      } else {
        res.send(html)
      }
    })
  })
}
