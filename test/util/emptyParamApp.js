const app = require(`../../../roosevelt`)()

process.send = process.send || function () {}

app.initServer(() => {
  process.send(app.expressApp.get('params'))
})
