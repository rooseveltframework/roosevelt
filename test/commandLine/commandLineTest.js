/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')
const fork = require('child_process').fork

describe('Command Line Tests', function () {
  const appDir = path.join(__dirname, '../app/commandLineTest')

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    let dataIn = `const path = require('path')
    const appDir = path.join(__dirname, '../app/commandLineTest')
    const app = require('../../../roosevelt')({
      appDir: appDir,
      generateFolderStructure: false,
    })
    if (process.send) {
      process.send(app.expressApp.get('params'))
    }
    `

    fs.writeFileSync(path.join(appDir, 'app.js'), dataIn)
  })

  after(function (done) {
    rimraf(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it.only('should execute the server and change params based on command line args', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', params => {
      assert.equal(params.nodeEnv, 'development')
      done()
    })
  })
})
