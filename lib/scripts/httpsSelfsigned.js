
if (module.parent) {
  module.exports = {
    certsGen: certsGen
  }
} else {
  certsGen()
}
function certsGen (appDir) {
  const selfsigned = require('selfsigned')
  const pems = selfsigned.generate(null, {
    keySize: 2048, // the size for the private key in bits (default: 1024)
    days: 3652500, // how long till expiry of the signed certificate (default: 10,000)
    algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
    extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
    pkcs7: true, // include PKCS#7 as part of the output (default: false)
    clientCertificate: true, // generate client cert signed by the original key (default: false)
    clientCertificateCN: 'unkown' // client certificate's common name (default: 'John Doe jdoe123')
  })

  const fs = require('fs')
  const key = pems.private
  const cert = pems.cert
  const keyFolder = './certs'
  const path = require('path')
  if (!appDir) {
    let processEnv
    if (fs.existsSync(path.join(process.cwd(), 'node_modules')) === false) {
      processEnv = process.cwd()
    } else {
      processEnv = undefined
    }
    appDir = processEnv
  }

  try {
    if (!fs.existsSync(keyFolder)) {
      fs.mkdirSync(keyFolder)
    }
    fs.writeFile('./certs/key.pems', key, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })

    fs.writeFile('./certs/cert.pems', cert, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
