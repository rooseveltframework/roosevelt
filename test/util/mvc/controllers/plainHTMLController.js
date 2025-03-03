module.exports = (router) => {
  const path = require('path')
  // route to request the plain HTML page and return the HTML page
  router.route('/HTMLTest').get((req, res) => {
    // save the path of the plain HTML page
    const htmlPath = path.join(__dirname, '../views/plainHTMLTest.html')
    // send the plain HTML page back
    res.sendFile(htmlPath)
  })

  router.route('/HTMLTest/nested').get((req, res) => {
    // save the path of the plain HTML page
    const htmlPath = path.join(__dirname, '../views/plainHTMLTest.html')
    // send the plain HTML page back
    res.sendFile(htmlPath)
  })

  router.route('/HTMLTest2').get((req, res) => {
    // save the path of the plain HTML page
    const htmlPath = path.join(__dirname, '../views/plainHTMLTest.html')
    // send the plain HTML page back
    res.sendFile(htmlPath)
  })
}
