// internal roosevelt module for notices that repeat on every start
// these are printed every time by default, since a notice nobody sees is worse than one seen too often
// when the user opts into quieterStartup, each notice is shown at most once a day, so that restarting over and over while developing does not repeat the same lines endlessly
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

const oneDay = 86400000

module.exports = app => {
  const logger = app.get('logger')
  const quieterStartup = !!app.get('params').logging?.quieterStartup

  // the record lives outside the app's own folders so that it survives a restart even when build artifacts are switched off, and so that clearing it is as simple as rebooting
  const recordFile = path.join(os.tmpdir(), `roosevelt-notices-${crypto.createHash('sha1').update(String(app.get('appDir'))).digest('hex')}.json`)

  return (key, ...message) => {
    if (!quieterStartup) return logger.warn(...message)

    let lastShown = {}
    try {
      lastShown = fs.readJsonSync(recordFile)
    } catch {
      // no record yet, or one that cannot be read, which just means this notice gets shown
    }

    if (Date.now() - (lastShown[key] || 0) < oneDay) return

    logger.warn(...message)
    lastShown[key] = Date.now()
    try {
      fs.outputJsonSync(recordFile, lastShown)
    } catch {
      // failing to remember only means the notice shows again next time, which is the safe direction
    }
  }
}
