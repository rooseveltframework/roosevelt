// whether the authority that signed the app's HTTPS certificate is one this machine trusts, and how to install mkcert when it is not
//
// the check reads the operating system's own trust store, which is what curl, chrome and safari go by
//
// firefox keeps a store of its own on every platform that this cannot see, so a false here is certain while a true is only the operating system saying yes, which is why the advice still says to restart the browser rather than promising the warning is gone
const fs = require('fs-extra')
const tls = require('tls')

// the base64 body of a pem, so two encodings of the same certificate compare equal however their lines were wrapped
function pemBody (pem) {
  return String(pem).replace(/-----[^-]*-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '')
}

// true when the operating system trusts it, false when it does not, and null when that cannot be worked out
//
// null is its own answer rather than a false, because the caller warns on false, and warning someone because roosevelt could not read a file would send them to fix something that is not broken
function isTrustedByOS (caCertPath) {
  if (typeof tls.getCACertificates !== 'function') return null // a node too old to report the system store

  let ours
  try {
    ours = pemBody(fs.readFileSync(caCertPath, 'utf8'))
  } catch {
    return null // no authority to check
  }
  if (!ours) return null

  try {
    return tls.getCACertificates('system').some(pem => pemBody(pem) === ours)
  } catch {
    return null
  }
}

// how to install mkcert on the platform this is running on
//
// the linux answer depends on the distribution, so it is read from os-release rather than assuming everyone runs debian
function mkcertInstallCommand () {
  if (process.platform === 'darwin') return 'brew install mkcert nss'
  if (process.platform === 'win32') return 'choco install mkcert'

  let osRelease = ''
  try {
    osRelease = fs.readFileSync('/etc/os-release', 'utf8').toLowerCase()
  } catch {
    // an unreadable os-release just means the most common answer is used
  }
  if (/fedora|rhel|centos/.test(osRelease)) return 'sudo dnf install mkcert nss-tools'
  return 'sudo apt install mkcert libnss3-tools'
}

module.exports = { isTrustedByOS, mkcertInstallCommand }
