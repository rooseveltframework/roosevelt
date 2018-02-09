module.exports = (app) => {
  app.route('/serverError').get((req, res, next) => {
    // make an error
    try {
      throw new Error('creating Internal Server error 500')
    } catch (err) {
      next(err)
    }
  })
}
