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

  if (!keyFolder) {
    keyFolder = params.secretsDir
  }

  try {
    // make secrets folder if non-existent
    if (!fs.existsSync(appDir + '/' + keyFolder)) {
      const path = appDir + '/' + keyFolder
      fs.mkdirSync(path)
    }

    // TODO: use fse instead of the manual implementation
    writeFileSyncRecursive(params.https.authInfoPath.authCertAndKey.key, key, 'utf-8')
    writeFileSyncRecursive(params.https.authInfoPath.authCertAndKey.cert, cert, 'utf-8')
  } catch {}

  // this handy function found on https://gist.github.com/drodsou/de2ba6291aea67ffc5bc4b52d8c32abd
  // allows the filename to be a path, and will create any missing folders
  function writeFileSyncRecursive (filename, content, charset) {
    // normalize path separator to '/' instead of path.sep,
    // as / works in node for Windows as well, and mixed \\ and / can appear in the path
    let filepath = filename.replace(/\\/g, '/')

    // preparation to allow absolute paths as well
    let root = ''
    if (filepath[0] === '/') {
      root = '/'
      filepath = filepath.slice(1)
    } else if (filepath[1] === ':') {
      root = filepath.slice(0, 3) // c:\
      filepath = filepath.slice(3)
    }

    // create folders all the way down
    const folders = filepath.split('/').slice(0, -1) // remove last item, file
    folders.reduce(
      (acc, folder) => {
        const folderPath = acc + folder + '/'
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath)
        }
        return folderPath
      },
      root // first 'acc', important
    )

    // write file
    fs.writeFileSync(root + filepath, content, charset)
  }
}
