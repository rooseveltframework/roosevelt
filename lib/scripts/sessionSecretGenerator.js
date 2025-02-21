const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

if (module.parent) module.exports = sessionSecretGenerator
else sessionSecretGenerator()

function sessionSecretGenerator (secretsPath) {
  const sessionSecret = { secret: crypto.randomUUID() }

  // source the relevant user params from sourceParams when running in CLI mode
  // TODO: expose the ability to supply these as command line flags
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir: process.cwd() })
    secretsPath = params.secretsPath
  }

  fs.outputJsonSync(path.join(secretsPath, 'sessionSecret.json'), sessionSecret)
}
