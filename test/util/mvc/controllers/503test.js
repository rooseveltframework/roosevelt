module.exports = function (app, req, res) {
  const path = require('path')
  // grab the custom 503 page file
  const Path503 = path.join(__dirname, '../', 'views', '503test.html')
  // send back the 503 status
  res.status(503)
  // send back the file
  res.sendFile(Path503)
}
