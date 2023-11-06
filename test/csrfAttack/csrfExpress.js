const express = require('express')
const path = require('path')
const app = express()
const https = require('https')
const http = require('http')
const fs = require('fs')

try {
  const httpsOptions = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
  }

  app.set('port', 3001)
  app.enable('trust proxy')

  https.createServer(httpsOptions, app).listen(app.get('port'), function () {
    console.log('Express HTTPS server listening on port ' + app.get('port'))
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '/'))
    })
  })
  app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, '/form'))
  })
  app.post('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/'))
  })
} catch (e) {
  console.log(e)
}
