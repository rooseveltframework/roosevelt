module.exports = (app) => {
  const path = require('path')
  // route to request the plain HTML page and return the HTML page
  app.route('/Broken').get((req, res) => {
    // Path to broken html
    const badPath = path.join(__dirname, '../views/brokenHTMLTest.html')
    // send broken html to user
    res.sendFile(badPath)
  })

  app.route('/brokenHeaderTest').get((req, res) => {
    // Path to broken html
    const badPath = path.join(__dirname, '../views/brokenHTMLTest.html')
    // set the response header to have the value of what will be needed to stop validating
    res.set('partialTest', 'test')
    // send broken html to user
    res.sendFile(badPath)
  })

  app.route('/brokenObjectTest').get((req, res) => {
    // Path to broken html
    const badPath = path.join(__dirname, '../views/brokenHTMLTest.html')
    // create the object that has a value that will stop validation
    const model = { _disableValidatorTest: 4342 }
    // render broken html to user
    res.render(badPath, model)
  })

  app.route('/brokenObject2Test').get((req, res) => {
    // Path to broken html
    const badPath = path.join(__dirname, '../views/brokenHTMLTest.html')
    // create the object that has a value that will stop validation
    const model = { somethingElse: 2313 }
    // render broken html to user
    res.render(badPath, model)
  })
}
