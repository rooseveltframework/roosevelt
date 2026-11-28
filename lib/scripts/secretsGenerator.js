#!/usr/bin/env node
const certsGenerator = require('./certsGenerator')
const sessionSecretGenerator = require('./sessionSecretGenerator')

module.exports = secretsGenerator
module.exports.fromCommandLine = fromCommandLine

if (require.main === module) {
  fromCommandLine().catch(err => {
    console.error('❌', err)
    process.exitCode = 1
  })
}

async function secretsGenerator (secretsPath, httpsParams, caPath) {
  await certsGenerator(secretsPath, httpsParams, caPath)
  sessionSecretGenerator(secretsPath)
}

// both commands read the same flags, so the ones given here are handed to each of them
async function fromCommandLine (argv) {
  await certsGenerator.fromCommandLine(argv)
  sessionSecretGenerator.fromCommandLine(argv)
}
