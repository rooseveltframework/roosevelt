#!/usr/bin/env node
// stands in for the mkcert binary so the suite can cover roosevelt's use of it on a machine that does not have it installed
//
// it copies the two behaviors roosevelt relies on: printing the authority's directory when asked for -CAROOT, and writing a certificate and key signed by an authority whose name contains "mkcert"
//
// it is not mkcert: it does nothing with any trust store, which is the part of mkcert roosevelt cannot test for itself
const fs = require('fs-extra')
const path = require('path')
const selfsigned = require('selfsigned')

const caRoot = process.env.MKCERT_STUB_CAROOT
const args = process.argv.slice(2)

if (args[0] === '-CAROOT') {
  console.log(caRoot)
  process.exit(0)
}

;(async () => {
  const caCertFile = path.join(caRoot, 'rootCA.pem')
  const caKeyFile = path.join(caRoot, 'rootCA-key.pem')

  if (!fs.pathExistsSync(caCertFile)) {
    const ca = await selfsigned.generate([{ name: 'commonName', value: 'mkcert development CA' }], {
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [{ name: 'basicConstraints', cA: true }, { name: 'keyUsage', keyCertSign: true }]
    })
    fs.outputFileSync(caCertFile, ca.cert)
    fs.outputFileSync(caKeyFile, ca.private)
  }

  const certFile = args[args.indexOf('-cert-file') + 1]
  const keyFile = args[args.indexOf('-key-file') + 1]
  const hosts = args.filter(arg => !arg.startsWith('-') && arg !== certFile && arg !== keyFile)

  const leaf = await selfsigned.generate([{ name: 'commonName', value: hosts[0] }], {
    keySize: 2048,
    algorithm: 'sha256',
    ca: { key: fs.readFileSync(caKeyFile, 'utf8'), cert: fs.readFileSync(caCertFile, 'utf8') },
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: hosts.map(host => (/^[\d.:]+$/.test(host) ? { type: 7, ip: host } : { type: 2, value: host })) }
    ]
  })

  fs.outputFileSync(certFile, leaf.cert)
  fs.outputFileSync(keyFile, leaf.private)
})()
