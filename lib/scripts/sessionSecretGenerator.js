if (module.parent) {
  module.exports = {
    sessionSecretGenerator
  }
} else {
  sessionSecretGenerator()
}

function sessionSecretGenerator (appDir, keyFolder) {
  const crypto = require('crypto')
  const fs = require('fs')
  const path = require('path')

  if (!appDir) {
    let processEnv
    if (fs.existsSync(path.join(process.cwd(), 'node_modules')) === false) {
      processEnv = process.cwd()
    } else {
      processEnv = undefined
    }
    appDir = processEnv
  }

  try {
    if (!fs.existsSync(keyFolder)) {
      fs.mkdirSync(keyFolder)
    }

    fs.writeFileSync(keyFolder + '/sessionSecret.json', JSON.stringify({
      secret: crypto.randomUUID()
    }), err => {
      if (err) {
        console.error(err)
      }
      // file written successfully
    })
  } catch {}
}
