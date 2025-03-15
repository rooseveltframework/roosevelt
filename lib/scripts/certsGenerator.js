const path = require('path')
const fs = require('fs-extra')
const selfsigned = require('selfsigned')

let appDir
let secretsPath

// source from CLI
for (const i in process.argv) {
  const flag = process.argv[i]
  if (flag === '--appDir') appDir = process.argv[parseInt(i) + 1]
  if (flag === '--secretsPath') secretsPath = process.argv[parseInt(i) + 1]
}

// source from rooseveltConfig.json
if (!appDir) {
  try {
    const rooseveltConfig = require(path.join(__dirname, '../../../../rooseveltConfig.json'))
    if (rooseveltConfig && rooseveltConfig.appDir) appDir = rooseveltConfig.appDir
  } catch (e) {
    // swallow error
  }
}

// source from roosevelt.config.json
if (!appDir) {
  try {
    const rooseveltConfig = require(path.join(__dirname, '../../../../roosevelt.config.json'))
    if (rooseveltConfig && rooseveltConfig.appDir) appDir = rooseveltConfig.appDir
  } catch (e) {
    // swallow error
  }
}

// set default value
if (!appDir) appDir = path.join(__dirname, '../../../../')

if (module.parent) module.exports = certsGenerator
else certsGenerator()

function certsGenerator (setSecretsPath, httpsOptions) {
  if (setSecretsPath) secretsPath = setSecretsPath
  const pem = selfsigned.generate(null, {
    keySize: 2048, // the size for the private key in bits (default: 1024)
    days: 365000, // how long till expiry of the signed certificate (default: 10,000)
    algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
    extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
    pkcs7: true, // include PKCS#7 as part of the output (default: false)
    clientCertificate: true, // generate client cert signed by the original key (default: false)
    clientCertificateCN: 'unknown' // client certificate's common name (default: 'John Doe jdoe123')
  })
  const key = pem.private
  const cert = pem.cert

  // source the relevant user params from sourceParams when running in CLI mode
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir })
    secretsPath = params.secretsPath
    httpsOptions = params.https?.options
  }

  if (httpsOptions.cert && httpsOptions.key) {
    if (!fs.pathExistsSync(path.join(secretsPath, httpsOptions.key))) fs.outputFileSync(path.join(secretsPath, httpsOptions.key), key)
    if (!fs.pathExistsSync(path.join(secretsPath, httpsOptions.cert))) fs.outputFileSync(path.join(secretsPath, httpsOptions.cert), cert)
  }
}
