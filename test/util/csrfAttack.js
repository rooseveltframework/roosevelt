// generate roosevelt app.js for testing and place it in ./app
if (module.parent) {
  module.exports = {
    csrfAttack
  }
} else {
  csrfAttack()
}

function csrfAttack (appDir) {
  const fs = require('fs')
  const csrfKeyFolder = './test/csrfAttack'
  const { execSync } = require('child_process')

  if (!fs.existsSync(csrfKeyFolder)) {
    fs.mkdirSync(csrfKeyFolder)
  }

  const csrfHTML = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Some HTML that will not validate</title>
  </head>
    <body>
    <form method="POST" action="https://localhost:34711/form">
      <h1>Congratulations. You just won a bonus of 1 million dollars!!!</h1>
        <input type="hidden" name="uname" value="IamHere" />
        <input type="hidden" name="psw" value="123456" />
        <input type="submit" name="submitAttack" id="submitAttack" value="Click here to claim your bonus"/>
      </form>  
    
  </body>
  </html>`

  const csrfExpress = `const express = require('express')
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
`

  fs.writeFile('./test/csrfAttack/index.html', csrfHTML, err => {
    if (err) {
      console.error(err)
    }
    // file written successfully
  })
  fs.writeFile('./test/csrfAttack/csrfExpress.js', csrfExpress, err => {
    if (err) {
      console.error(err)
    }
    // file written successfully
  })
  // certsGenerator()

  try {
    execSync('node ./test/csrfAttack/csrfExpress.js')
  } catch (e) {
    console.log(e)
  }
}
