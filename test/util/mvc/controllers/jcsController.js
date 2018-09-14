module.exports = (app) => {
  app.route('/jcsTest').get((req, res) => {
    res.render('jcsIndex', { header: 'jcsHeader', paragraph: 'jcsParagraph' })
  })
}
