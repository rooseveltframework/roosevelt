module.exports = (app) => {
  app.route('/longConn').get((req, res) => {
    process.send('inConn')
    for (let x = 0; x < 1000; x++) {
      console.log(x)
    }
    res.send('world')
  })
}
