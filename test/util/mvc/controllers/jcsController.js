module.exports = (router) => {
  router.route('/jcsTest').get((req, res) => {
    res.render('jcsIndex', { header: 'jcsHeader', paragraph: 'jcsParagraph' })
  })
}
