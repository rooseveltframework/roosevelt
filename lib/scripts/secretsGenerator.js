#!/usr/bin/env node
if (module.parent) module.exports = secretsGenerator
else secretsGenerator()

async function secretsGenerator (secretsPath, httpsParams) {
  await require('./certsGenerator')(secretsPath, httpsParams)
  require('./sessionSecretGenerator')(secretsPath)
}
