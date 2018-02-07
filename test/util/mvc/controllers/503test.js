module.exports = (app) => {
  const path = require('path')
  app.route('/custom503').get((req, res) => {
    // grab the custom 503 page
    const Path503 = path.join(__dirname, '../', 'views', '503test.html')
    // send back the file
    res.status(503)
    res.sendFile(Path503)
  })
}
