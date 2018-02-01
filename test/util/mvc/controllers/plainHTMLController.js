module.exports = (app) => {
  const path = require('path')
  // route to request the plain HTML page and return the HTML page
  app.route('/HTMLTest').get((req, res) => {
    // send the plain HTML page back
    res.sendFile(path.join(__dirname, '../views/plainHTMLTest.html'))
  })
}
