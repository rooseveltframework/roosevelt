const app = require(`../../../roosevelt`)({ appDir: 'C:\\Users\\Johnny\\Documents\\roosevelt\\test\\app\\rooseveltTest',
  generateFolderStructure: true })

process.send = process.send || function () {}

app.initServer()
