if (module.parent) {
  module.exports = {
    generateSecrets
  }
} else {
  generateSecrets()
}

function generateSecrets () {
  const fs = require('fs')
  const sourceParams = require('../sourceParams')
  const { certsGenerator } = require('./certsGenerator')
  const { sessionSecretGenerator } = require('./sessionSecretGenerator')

  // source configs
  const appDir = process.cwd()
  const params = sourceParams({ appDir })
  const keyFolder = params.secretsFolder

  // make secrets folder
  if (!fs.existsSync.keyFolder) {
    fs.mkdirSync(keyFolder)
  }

  // generate keys/certs/secrets
  certsGenerator(appDir, keyFolder)
  sessionSecretGenerator(appDir, keyFolder)
}
