module.exports = (app) => {
  app.route('/longWait').get((req, res) => {
    console.log('waiting')
    setTimeout(() => {
      res.send('longWait done')
    }, 50000)
    process.send('waiting')
  })
}
