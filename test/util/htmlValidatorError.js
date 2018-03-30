module.exports = (app) => {
  app.route('/').get((req, res) => {
    // send an error
    throw new Error('something')
  })
}
