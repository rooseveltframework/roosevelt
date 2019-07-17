module.exports = (router) => {
  router.route('/paramPost').post((req, res) => {
    const keys = Object.keys(req.body)
    const count = keys.length
    res.send(count.toString())
  })

  router.route('/paramPostAfter').get((req, res) => {
    console.log('Testing before: ' + res.Testing)
    res.Testing = 'someValue'
    res.end()
  })
}
