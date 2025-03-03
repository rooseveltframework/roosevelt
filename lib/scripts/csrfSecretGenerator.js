const fs = require('fs-extra')
const path = require('path')
const { randomBytes } = require('crypto')

let appDir
let secretsPath

// source from CLI
for (const i in process.argv) {
  const flag = process.argv[i]
  if (flag === '--appDir') appDir = process.argv[parseInt(i) + 1]
  if (flag === '--secretsPath') secretsPath = process.argv[parseInt(i) + 1]
}

// source from rooseveltConfig.json
if (!appDir) {
  try {
    const rooseveltConfig = require(path.join(__dirname, '../../../../rooseveltConfig.json'))
    if (rooseveltConfig && rooseveltConfig.appDir) appDir = rooseveltConfig.appDir
  } catch (e) {
    // swallow error
  }
}

// source from roosevelt.config.json
if (!appDir) {
  try {
    const rooseveltConfig = require(path.join(__dirname, '../../../../roosevelt.config.json'))
    if (rooseveltConfig && rooseveltConfig.appDir) appDir = rooseveltConfig.appDir
  } catch (e) {
    // swallow error
  }
}

// set default value
if (!appDir) appDir = path.join(__dirname, '../../../../')

if (module.parent) module.exports = csrfSecretGenerator
else csrfSecretGenerator()

function csrfSecretGenerator (setSecretsPath) {
  if (setSecretsPath) secretsPath = setSecretsPath
  const csrfSecret = {
    csrfSecret: randomBytes(64).toString('base64').slice(0, 64),
    cookieParserSecret: randomBytes(64).toString('base64').slice(0, 64)
  }

  // source the relevant user params from sourceParams when running in CLI mode
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir })
    secretsPath = params.secretsPath
  }

  fs.outputJsonSync(path.join(secretsPath, 'csrfSecret.json'), csrfSecret)
}
