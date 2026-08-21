module.exports = (router) => {
  const path = require('path')
  // express 5 spells a catch all route `*all`, while express 4 spells it `*`, so an app that supports both picks at runtime
  const expressMajor = parseInt(require('express/package.json').version.split('.')[0], 10)
  router.route(expressMajor >= 5 ? '*all' : '*').all((req, res) => {
    // grab the path to the 404 page
    const Path404 = path.join(__dirname, '../views/404test.html')
    // give that page back
    res.status(404)
    res.sendFile(Path404)
  })
}
