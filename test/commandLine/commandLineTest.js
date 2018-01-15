/* eslint-env mocha */

/* const assert = require('assert') */
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const rimraf = require('rimraf')
const childProcess = require('child_process')
describe('Command Line Tests', function () {
  const appDir = path.join(__dirname, '../app/commandLineTest')

  before(function () {
    fse.ensureDirSync(path.join(appDir))
    let dataIn = `const path = require('path')
    const appDir = path.join(__dirname, '../app/commandLineTest')
    const app = require('../../../roosevelt')({
      appDir: appDir,
      generateFolderStructure: true,
    })
    
    app.initServer(function () {
      global.app = app
      console.log(global.app.expressApp.get('env'))
      console.log('hit')
      console.log(global.app == app)
    })
    `

    fs.writeFileSync(path.join(__dirname, '../app/app.js'), dataIn)
  })

  after(function (done) {
    rimraf(appDir, (err) => {
      if (err) {
        throw err
      } else {
        if (global.app) {
          delete global.app
        }
        done()
      }
    })
  })

  it('should execute the server and change params based on command line args', function (done) {
    var test = childProcess.spawn('node', [path.join(__dirname, '../app/app.js'), '--dev'])

    test.stdout.on('data', function (data) {
      console.log('stdout ' + data.toString('utf8'))
      if (data.toString('utf8').includes('hit')) {
        console.dir(global.app.expressApp.get('env'))
        /* assert.equal(global.app.expressApp.get('env'), 'development') */
      }
    })

    test.on('data', (data) => {

    })

    test.stderr.on('data', function (data) {
      console.log('stderr: ' + data)
    })

    test.on('close', function (code) {
      done()
    })
  })
})
