const fse = require('fs-extra')

if (module.parent) {
  module.exports = {
    certsGenerator
  }
} else {
  certsGenerator()
}

function certsGenerator (appDir, keyFolder) {
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
  const path = require('path')
  const sourceParams = require('../sourceParams')

  if (!appDir) {
    const processEnv = fs.existsSync(path.join(process.cwd(), 'node_modules'))
      ? process.cwd()
      : undefined

    appDir = processEnv
  }

  const params = sourceParams({ appDir: process.cwd() })

  if (params.https?.authInfoPath?.authCertAndKey) {
    if (!keyFolder) keyFolder = params.secretsDir

    // make secrets folder if non-existent
    const filepath = appDir + '/' + keyFolder + '/'
    fse.writeFileSync(filepath + params.https.authInfoPath.authCertAndKey.key, key)
    fse.writeFileSync(filepath + params.https.authInfoPath.authCertAndKey.cert, cert)
  }
}
