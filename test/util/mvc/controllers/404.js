module.exports = (app) => {
  const path = require('path')
  app.route('*').get((req, res) => {
    // grab the path to the 404 page
    const Path404 = path.join(__dirname, '../', 'views', '404.html')
    // give that page back
    res.status(404)
    res.sendFile(Path404)
  })
}
