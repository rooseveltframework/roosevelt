module.exports = (app) => {
  const path = require('path')
  // route to request the plain HTML page and return the HTML page
  app.route('/controller2').get((req, res) => {
    // save the path of the plain HTML page
    let htmlPath = path.join(__dirname, '../../views/plainHTMLTest.html')
    // send the plain HTML page back
    res.sendFile(htmlPath)
  })
}
