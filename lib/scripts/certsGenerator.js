if (module.parent) {
  module.exports = {
    certsGenerator
  }
} else {
  certsGenerator()
}
function certsGenerator (appDir) {
  const selfsigned = require('selfsigned')
  const pem = selfsigned.generate(null, {
    keySize: 2048, // the size for the private key in bits (default: 1024)
    days: 365000, // how long till expiry of the signed certificate (default: 10,000)
    algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
    extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
    pkcs7: true, // include PKCS#7 as part of the output (default: false)
    clientCertificate: true, // generate client cert signed by the original key (default: false)
    clientCertificateCN: 'unknown' // client certificate's common name (default: 'John Doe jdoe123')
  })

  const fs = require('fs')
  const key = pem.private
  const cert = pem.cert

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
    fs.writeFileSync('./certs/key.pem', key, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })

    fs.writeFileSync('./certs/cert.pem', cert, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
