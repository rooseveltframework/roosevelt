module.exports = (app) => {
  const path = require('path')
  // route to request the plain HTML page and return the HTML page
  app.route('/Broken').get((req, res) => {
    // Path to broken html
    const badPath = path.join(__dirname, '../', 'views', 'brokenHTMLTest.html')
    // send broken html to server
    res.sendFile(badPath)
  })
}
