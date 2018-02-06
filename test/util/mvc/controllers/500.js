module.exports = function (app, err, req, res, next) {
  const path = require('path')
  // grab the path of the 500 page
  const Path500 = path.join(__dirname, '../', 'views', '500.html')
  // send back a status code of 500
  res.status(500)
  // send back the 500 page
  res.sendFile(Path500)
}
