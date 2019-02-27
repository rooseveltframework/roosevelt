module.exports = (router) => {
  router.route('/redirect').post((req, res) => {
    let argArray = []
    if (req.body.status) argArray.push(parseInt(req.body.status))
    if (req.body.address) argArray.push(req.body.address)
    if (req.body.override) argArray.push(req.body.override === 'true')
    res.redirect(...argArray)
  })

  router.route('/endpoint').get((req, res) => {
    res.send('redirection successful')
  })
}
