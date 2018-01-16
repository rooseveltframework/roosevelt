const path = require('path')
const appDir = path.join(__dirname, '../app/commandLineTest')
const app = require('../../../roosevelt')({
  appDir: appDir,
  generateFolderStructure: false
})
if (process.send) {
  process.send(app.expressApp.get('params'))
  process.exit()
}
