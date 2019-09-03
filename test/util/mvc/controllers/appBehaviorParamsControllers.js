module.exports = (router, app) => {
  router.route('/paramLimit').post((req, res) => {
    const test1 = req.body.test1

    res.send(`Recieved params from url ${test1}`)
  })

  router.route('/JSONLimit').post((req, res) => {
    const keys = Object.keys(req.body)
    const arrayOfValues = []

    for (let x = 0; x < keys.length; x++) {
      arrayOfValues.push(req.body[keys[x]])
    }
    res.send(arrayOfValues)
  })

  app.use((err, req, res, next) => {
    res.status(413).send(err)
  })
}
