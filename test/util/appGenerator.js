// generate roosevelt app.js for testing and place it in ./app

const fs = require('fs-extra')
const path = require('path')
const util = require('util')

module.exports = params => {
  const appDir = path.join(__dirname, '../app', params.location)
  let appTemplate = `
    (async () => {
      let sinon
      let clock
      const app = require('../../../roosevelt.js')(
        ${util.inspect(params.config)}
      )
      await app.${params.method}()`

  // add a ipc listener for incrementing time with sinon
  appTemplate += `
      if (process.argv.includes('--hacky-sinon-timer')) {
        process.on('message', message => {
          // setup the clock
          if (message.includes('sinon init')) {
            sinon = require('sinon')
            clock = sinon.useFakeTimers()
          } else if (message.includes('warp time')) {
            clock.tick(30000)
            process.disconnect()
          }
        })
      }
    })()`

  // generate test app directory
  fs.ensureDirSync(path.join(appDir))

  // generate app.js in test directory
  fs.writeFileSync(path.join(appDir, 'app.js'), appTemplate)
}
