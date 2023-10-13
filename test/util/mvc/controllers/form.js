module.exports = (router, app) => {
  router.route('/form').all((req, res) => {
    const model = require('models/form')(req, res)
    res.render('form', model)
  })
}
// module.exports = router => {
//   const model = require('models/form')

//   router.route('/').get((req, res) => {
//     res.render('form', model, (err, html) => {
//       if (err) {
//         console.error(err)
//       } else {
//         res.send(html)
//       }
//     })
//   })
// }
