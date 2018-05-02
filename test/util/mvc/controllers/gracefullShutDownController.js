module.exports = (app) => {
  app.route('/longWait').get((req, res) => {
    process.send('waiting')
    setTimeout(() => {
      res.send('longWait done')
    }, 10000)
  })
}
