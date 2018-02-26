module.exports = (app) => {
  // route that will use the multipart features
  app.route('/simpleMultipart').post((req, res) => {
    // object to send back to client
    let test = {}
    // save the amount of files onto the object and send it back
    let keys = Object.keys(req.files)
    test.count = keys.length
    res.send('5')
  })
}
