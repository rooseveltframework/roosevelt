if (module.parent) module.exports = csrfSecretGenerator
else csrfSecretGenerator()

function csrfSecretGenerator (appDir, keyFolder) {
  const { randomBytes } = require('crypto')
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

    fs.writeFileSync(keyFolder + '/csrfSecret.json', JSON.stringify({
      csrfSecret: randomBytes(64).toString('base64').slice(0, 64),
      cookieParserSecret: randomBytes(64).toString('base64').slice(0, 64)
    }), err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
