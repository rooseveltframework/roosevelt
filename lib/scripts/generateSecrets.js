if (module.parent) {
  module.exports = {
    generateSecrets
  }
} else {
  generateSecrets()
}

function generateSecrets (params, appEnv = 'development') {
  const fs = require('fs')
  const sourceParams = require('../sourceParams')
  const { certsGenerator } = require('./certsGenerator')
  const { sessionSecretGenerator } = require('./sessionSecretGenerator')

  // source configs
  let appDir

  if (!params) {
    appDir = process.cwd()
    params = sourceParams({ appDir })
  }

  if (!params.appDir) {
    appDir = process.cwd()
  }

  const keyFolder = params.secretsDir

  // make secrets folder
  if (!fs.existsSync.keyFolder) {
    fs.mkdirSync(keyFolder)
  }

  // generate keys/certs/secrets
  if (params.expressSession && !fs.existsSync(keyFolder + '/sessionSecret.json')) {
    sessionSecretGenerator(appDir, keyFolder)
  }

  if (params.https.enable && appEnv === 'development' && params.https.autoCert) {
    if (!fs.existsSync(params.secretsDir + '/key.pem') || (!fs.existsSync(params.secretsDir + '/cert.pem'))) {
      certsGenerator(appDir, keyFolder)
    }
  }
}
