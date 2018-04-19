module.exports = (app) => {
  app.route('/longConn').get((req, res) => {
    process.send('inConn')
    setTimeout(() => {
      res.send('world')
    }, 10000)
  })
}
