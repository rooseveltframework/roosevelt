let test = {}

module.exports = (app) => {
  app.route('/err').get(test.inventoryNum, (req, res) => {
    let count = test.inventoryNum + 1
    res.send(count)
  })
}
