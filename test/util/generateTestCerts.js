const path = require('path')
const fs = require('fs-extra')
const selfsigned = require('selfsigned')
const forge = require('node-forge')

module.exports = (appDir, secretDir) => {
  const pem = selfsigned.generate(null, {
    keySize: 2048,
    days: 365000,
    algorithm: 'sha256',
    extensions: [{ name: 'basicConstraints', cA: true }],
    pkcs7: true,
    clientCertificate: true,
    clientCertificateCN: 'unknown'
  })

  const key = pem.private
  const cert = pem.cert

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

  const fullSecretDir = path.join(appDir, secretDir)

  fs.ensureDirSync(fullSecretDir)
  fs.emptyDirSync(fullSecretDir)
  fs.writeFileSync(path.join(fullSecretDir, 'key.pem'), key)
  fs.writeFileSync(path.join(fullSecretDir, 'cert.pem'), cert)
  fs.writeFileSync(path.join(fullSecretDir, 'cert.p12'), p12Cert)
}
