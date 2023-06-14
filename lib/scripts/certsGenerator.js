if (module.parent) {
  module.exports = {
    certsGenerator
  }
} else {
  certsGenerator()
}
function certsGenerator (appDir) {
  const selfsigned = require('selfsigned')
  const forge = require('node-forge')
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
  const certificate = forge.pki.certificateFromPem(cert)
  const privateKey = forge.pki.privateKeyFromPem(key)

  // generate p12 and encrypt them
  const p12Info = forge.pkcs12.toPkcs12Asn1(privateKey, certificate, '', { generateLocalKeyId: true, algorithm: '3des' })
  const p12Cert = forge.asn1.toDer(p12Info).getBytes()

  try {
    if (!fs.existsSync(keyFolder)) {
      fs.mkdirSync(keyFolder)
    }

    fs.writeFile('./certs/key.pem', key, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })

    fs.writeFile('./certs/cert.pem', cert, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })

    fs.writeFile('./certs/cert.p12', p12Cert, err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
