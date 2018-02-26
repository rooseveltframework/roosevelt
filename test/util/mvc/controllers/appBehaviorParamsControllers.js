module.exports = (app) => {
  app.route('/paramLimit').post((req, res) => {
    let test1 = req.body.test1

    res.send(`Recieved params from url ${test1}}`)
  })

  app.route('/JSONLimit').post((req, res) => {
    let keys = Object.keys(req.body)
    let arrayOfValues = []

    for (let x = 0; x < keys.length; x++) {
      arrayOfValues.push(req.body[keys[x]])
    }
    res.send(arrayOfValues)
  })

  app.use((err, req, res, next) => {
    res.status(413).send(err)
  })
}
