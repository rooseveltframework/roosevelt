const fs = require('fs-extra')
const path = require('path')
const { randomBytes } = require('crypto')

if (module.parent) module.exports = csrfSecretGenerator
else csrfSecretGenerator()

function csrfSecretGenerator (secretsPath) {
  const csrfSecret = {
    csrfSecret: randomBytes(64).toString('base64').slice(0, 64),
    cookieParserSecret: randomBytes(64).toString('base64').slice(0, 64)
  }

  // source the relevant user params from sourceParams when running in CLI mode
  // TODO: expose the ability to supply these as command line flags
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir: process.cwd() })
    secretsPath = params.secretsPath
  }

  fs.outputJsonSync(path.join(secretsPath, 'csrfSecret.json'), csrfSecret)
}
