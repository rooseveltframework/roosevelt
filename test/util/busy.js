module.exports = (app) => {
  app.route('/').get((req, res) => {
    let max = Math.pow(10, 1000)
    let y = 0
    for (let x = 0; x < max; x++) {
      y = y + 1
    }
    console.log('fsfsfsffssff')
    res.send('hello')
  })
}
