if (module.parent) module.exports = secretsGenerator
else secretsGenerator()

function secretsGenerator (secretsPath, httpsParams) {
  require('./certsGenerator')(secretsPath, httpsParams)
  require('./sessionSecretGenerator')(secretsPath)
}
