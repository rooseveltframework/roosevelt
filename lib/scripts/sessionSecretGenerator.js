#!/usr/bin/env node
const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

let appDir
let secretsPath

// source from CLI
for (const i in process.argv) {
  const flag = process.argv[i]
  if (flag === '--appDir') appDir = process.argv[parseInt(i) + 1]
  if (flag === '--secretsPath') secretsPath = process.argv[parseInt(i) + 1]
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

if (module.parent) module.exports = sessionSecretGenerator
else sessionSecretGenerator()

function sessionSecretGenerator (setSecretsPath) {
  if (setSecretsPath) secretsPath = setSecretsPath
  const sessionSecret = { secret: crypto.randomUUID() }

  // source the relevant user params from sourceParams when running in CLI mode
  if (!secretsPath) {
    const params = require('../sourceParams')({ appDir })
    secretsPath = params.secretsPath
  }

  fs.outputJsonSync(path.join(secretsPath, 'sessionSecret.json'), sessionSecret)
}
