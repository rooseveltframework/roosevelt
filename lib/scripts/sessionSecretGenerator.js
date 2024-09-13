if (module.parent) module.exports = sessionSecretGenerator
else sessionSecretGenerator()

function sessionSecretGenerator (appDir, keyFolder) {
  const crypto = require('crypto')
  const fs = require('fs')
  const path = require('path')
  const sourceParams = require('../sourceParams')

  if (!appDir) {
    const processEnv = fs.existsSync(path.join(process.cwd(), 'node_modules'))
      ? process.cwd()
      : undefined

    appDir = processEnv
  }

  if (!keyFolder) {
    const params = sourceParams({ appDir: process.cwd() })
    keyFolder = params.secretsDir
  }

  try {
    // make secrets folder if non-existent
    if (!fs.existsSync(appDir + '/' + keyFolder)) {
      const path = appDir + '/' + keyFolder
      fs.mkdirSync(path)
    }

    fs.writeFileSync(keyFolder + '/sessionSecret.json', JSON.stringify({
      secret: crypto.randomUUID()
    }), err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
