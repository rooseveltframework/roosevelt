let test = {}
// test.inventoryNum is there to help test that Roosevelt will throw an error if the controller is coded incorrectly
module.exports = (app) => {
  app.route('/err').get(test.inventoryNum, (req, res) => {
    let count = test.inventoryNum + 1
    res.send(count)
  })
}
