module.exports = (router) => {
  router.route('/longConn').get((req, res) => {
    process.send('inConn')
    setTimeout(() => {
      res.send('world')
    }, 10000)
  })

  router.route('/slow').get((req, res) => {
    let start = new Date()
    while ((new Date() - start) < 250) {
      for (var i = 0; i < 1e5;) i++
    }
    res.send('done')
  })
}
