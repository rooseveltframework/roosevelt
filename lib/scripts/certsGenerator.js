#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const selfsigned = require('selfsigned')
const { X509Certificate } = require('crypto')
const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

const renewWithin = 30 * 24 * 60 * 60 * 1000 // a certificate this close to expiring is replaced now rather than during a session

let appDir
let secretsPath
let caPath

// the development authority roosevelt signs with, which lives in the app's own secrets folder beside the certificate it signs
//
// one authority shared between apps would mean trusting it once rather than once per app, but that is what mkcert is for, and installing mkcert is something the developer chooses to do; roosevelt writing an authority into the home directory to get the same effect would be making that choice for them, and would leave a key that can sign for any host somewhere deleting the app does not reach
//
// pass a caPath to share one authority across apps on purpose
const caCommonName = 'Roosevelt Development CA'
const caCertName = 'rooseveltDevCA.pem'
const caKeyName = 'rooseveltDevCA-key.pem'

// source from CLI
for (const i in process.argv) {
  const flag = process.argv[i]
  if (flag === '--appDir') appDir = process.argv[parseInt(i) + 1]
  if (flag === '--secretsPath') secretsPath = process.argv[parseInt(i) + 1]
  if (flag === '--caPath') caPath = process.argv[parseInt(i) + 1]
}

// source from the app's config file
for (const name of ['roosevelt.config.js', 'rooseveltConfig.js']) {
  if (appDir) break
  try {
    const rooseveltConfig = require(path.join(__dirname, '../../../../', name))
    if (rooseveltConfig && rooseveltConfig.appDir) appDir = rooseveltConfig.appDir
  } catch (e) {
    // a config that is absent or fails to load simply does not supply an appDir
  }
}

// set default value
if (!appDir) appDir = path.join(__dirname, '../../../../')

if (module.parent) module.exports = certsGenerator
else certsGenerator()

// mkcert is a tool a developer installs to make certificates their machine actually trusts
//
// roosevelt cannot do that part itself: putting an authority into the system and browser trust stores means writing to places outside the app and asking for a password, which is a thing to run on purpose rather than something a dev server should do behind your back
//
// so when mkcert is there, roosevelt signs with it and the certificate is trusted; when it is not, roosevelt signs with an authority of its own and the certificate works but is not trusted until you say so
async function findMkcert () {
  try {
    const { stdout } = await execFileAsync('mkcert', ['-CAROOT'])
    const caRoot = stdout.trim()

    // whether mkcert's authority is actually in the trust stores is deliberately not guessed at here: mkcert writes its rootCA.pem the first time it signs anything, whether or not `mkcert -install` was ever run, so the file being there says nothing about whether anything trusts it, and finding out for real means reading a different store per platform
    return { caRoot, caCertPath: path.join(caRoot, 'rootCA.pem') }
  } catch {
    return null // not on the path, or it did not run, either of which means signing this the other way
  }
}

// makes the development authority if it is not there yet, and hands back what is needed to sign with it
//
// it is kept for ten years because it is only replaced deliberately: every certificate it has signed stops being trusted the moment it changes, and a developer would have to trust the new one all over again
async function ensureCA (dir) {
  const certFile = path.join(dir, caCertName)
  const keyFile = path.join(dir, caKeyName)

  if (fs.pathExistsSync(certFile) && fs.pathExistsSync(keyFile)) {
    return { cert: fs.readFileSync(certFile, 'utf8'), key: fs.readFileSync(keyFile, 'utf8'), certFile, existed: true }
  }

  const tenYears = new Date()
  tenYears.setFullYear(tenYears.getFullYear() + 10)

  const pem = await selfsigned.generate([{ name: 'commonName', value: 'Roosevelt Development CA' }], {
    keySize: 2048,
    algorithm: 'sha256',
    notAfterDate: tenYears,
    extensions: [
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true }
    ]
  })

  fs.outputFileSync(certFile, pem.cert)
  // this key can sign a certificate for any host, so it is written readable only by the developer it belongs to
  //
  // windows has no posix permission bits and ignores this, so there the key is protected by whatever the containing folder's acl says and nothing more
  fs.outputFileSync(keyFile, pem.private, { mode: 0o600 })

  return { cert: pem.cert, key: pem.private, certFile, existed: false }
}

// whether the certificate sitting there is one roosevelt or mkcert signed
//
// a missing certificate counts as roosevelt's, since roosevelt is about to write it; anything it cannot read does not, because an app may be pointed at something roosevelt does not understand
//
// this decides more than whether to replace it: an app serving a certificate of its own has its own authority behind it, so roosevelt has nothing to say about whether that one is trusted either
function certIsOurs (certFile) {
  if (!fs.pathExistsSync(certFile)) return true

  try {
    const issuer = new X509Certificate(fs.readFileSync(certFile)).issuer
    return issuer.includes(caCommonName) || issuer.includes('mkcert')
  } catch {
    return false
  }
}

// whether the certificate already sitting there is one roosevelt should replace
//
// only certificates roosevelt signed are ever replaced. an app pointed at a certificate of its own, from mkcert or anywhere else, is left alone: overwriting that would be roosevelt deciding it knows better than the developer
//
// a certificate is replaced when it has expired or is close to it, and when it was signed by an authority that can no longer vouch for it, which covers an authority that was deleted and made again as well as a machine that has gained or lost mkcert since the certificate was written
//
// replacing it costs nothing to trust: the new one comes from the same authority as everything else roosevelt signs
function needsReplacing (certFile, caCertPem) {
  if (!fs.pathExistsSync(certFile)) return true

  try {
    const existing = new X509Certificate(fs.readFileSync(certFile))

    if (!certIsOurs(certFile)) return false // somebody else's certificate, so not roosevelt's to touch
    if (!caCertPem) return true // nothing to check it against, so it is not something that can be relied on
    // the signature is what settles this rather than the name: an authority that was deleted and made again carries the same name as the one before it, so comparing names would call a certificate no one can verify any more current
    if (!existing.verify(new X509Certificate(caCertPem).publicKey)) return true

    return new Date(existing.validTo).getTime() - Date.now() < renewWithin
  } catch {
    // it could not be read as a certificate, so there is no way to establish that it is roosevelt's
    //
    // that is exactly the case for leaving it alone: an app may be pointed at something roosevelt does not understand, and overwriting it on a guess would destroy it
    return false
  }
}

async function certsGenerator (setSecretsPath, httpsOptions, setCaPath) {
  if (setSecretsPath) secretsPath = setSecretsPath
  if (setCaPath) caPath = setCaPath

  // source the relevant user params from sourceParams when running in CLI mode
  //
  // this happens before anything is generated, since what gets generated depends on where it would go
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir })
    secretsPath = params.secretsPath
    httpsOptions = params.https?.options
  }

  // mkcert wins when it is there, because a certificate the machine trusts is the thing roosevelt cannot produce on its own
  const mkcert = await findMkcert()

  const result = { signer: mkcert ? 'mkcert' : 'roosevelt', certWasWritten: false }
  if (mkcert) result.caCertPath = mkcert.caCertPath

  if (!httpsOptions?.cert || !httpsOptions?.key) {
    if (!mkcert) {
      const ca = await ensureCA(caPath || secretsPath)
      result.caCertPath = ca.certFile
      result.caWasGenerated = !ca.existed
    }
    return result
  }

  const certFile = path.join(secretsPath, httpsOptions.cert)
  const keyFile = path.join(secretsPath, httpsOptions.key)
  result.certPath = certFile
  result.certIsOurs = certIsOurs(certFile)

  // an app serving its own certificate gets left alone entirely, which includes not making an authority it would never be signed by
  if (!result.certIsOurs) return result

  if (mkcert) {
    if (!needsReplacing(certFile, fs.pathExistsSync(mkcert.caCertPath) ? fs.readFileSync(mkcert.caCertPath) : null)) return result

    fs.ensureDirSync(secretsPath)
    // mkcert writes both files itself and picks the validity, so this hands it the hosts and gets out of the way
    await execFileAsync('mkcert', ['-cert-file', certFile, '-key-file', keyFile, 'localhost', '127.0.0.1', '::1'])
    result.certWasWritten = true
    return result
  }

  const ca = await ensureCA(caPath || secretsPath)
  result.caCertPath = ca.certFile
  result.caWasGenerated = !ca.existed

  // deciding first means a start that needs nothing done costs two file reads rather than generating a key to throw away
  if (!needsReplacing(certFile, ca.cert)) return result

  // the certificate the app serves, signed by the authority above rather than by itself
  //
  // browsers stopped reading the common name for hostname matching years ago and go by the subject alternative name instead, so a certificate without one is refused for the wrong host no matter whose trust store it has been added to
  //
  // naming any extension replaces the library's defaults rather than adding to them, so the key usages have to be listed here alongside it or they go missing
  const pem = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    algorithm: 'sha256',
    ca: { key: ca.key, cert: ca.cert },
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' }, // 2 is a dns name
          { type: 2, value: '*.localhost' }, // so that a named subdomain of localhost is covered too
          { type: 7, ip: '127.0.0.1' }, // 7 is an ip address
          { type: 7, ip: '::1' }
        ]
      }
    ]
  })

  // both are written together, since a key that does not match the certificate beside it is worse than neither
  fs.outputFileSync(keyFile, pem.private)
  fs.outputFileSync(certFile, pem.cert)
  result.certWasWritten = true

  return result
}
