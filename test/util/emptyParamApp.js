const app = require(`../../../roosevelt`)()

app.initServer(() => {
  process.send(app.expressApp.get('params'))
})
