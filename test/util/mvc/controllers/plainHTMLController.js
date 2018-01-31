module.exports = (app) => {
  // route to request the plain HTML page and return the HTML page
  app.route('/HTMLTest').get((req, res) => {
    // render the teddy template and pass it the model
    res.send('plainHTMLTest')
  })
}
