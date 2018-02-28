module.exports = (app) => {
  app.route('/paramPost').post((req, res) => {
    let keys = Object.keys(req.body)
    let count = keys.length
    res.send(count.toString())
  })

  app.route('/paramPostAfter').post((req, res) => {
    let keys = Object.keys(req.body)
    let count = keys.length
    console.log('text: ' + res.text)
    res.send('text: ' + count.toString())
  })
}
