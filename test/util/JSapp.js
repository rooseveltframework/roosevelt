const path = require('path')
const appDir = path.join(__dirname, '../JSTest')
const app = require('../../../roosevelt')({
  appDir: appDir,
  generateFolderStructure: true,
  suppressLogs: {
    httpLogs: true,
    rooseveltLogs: true,
    rooseveltWarnings: true
  },
  js: {
    compiler: {
      nodeModule: 'roosevelt-uglify',
      showWarnings: false,
      params: {}
    },
    output: '.build/js'
  }
})

app.initServer(function () {

})
