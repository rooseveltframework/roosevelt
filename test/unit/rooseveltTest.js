/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
// const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
// const request = require('supertest')

describe('Roosevelt roosevelt.js Section Tests', function () {
  const appDir = path.join(__dirname, '../', 'app', 'rooseveltTest')

  // options that would be put into generateTestApp params
  // const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should stil compile and run what is on initServer even when we do not pass a param object to roosevelt', function (done) {
    // create a empty app.js
    fse.ensureDirSync(appDir)
    let contents = fse.readFileSync(path.join(appDir, '../', '../', 'util', 'emptyParamApp.js')).toString('utf8')
    fse.writeFileSync(path.join(appDir, 'app.js'), contents)

    // read the default config file
    let defaults = fse.readFileSync(path.join(appDir, '../', '../', '../', 'lib', 'defaults', 'config.json')).toString('utf8')
    let defaultsJSON = JSON.parse(defaults)

    // fork the app and run it as a child processW
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // if we do get back an object of params, it means that roosevelt was able to complete its initialization
    testApp.on('message', (params) => {
      assert.equal(params.port, defaultsJSON.port, 'Roosevelt should make them the same if a param object is not passed in (port)')
      assert.equal(params.viewEngine, defaultsJSON.viewEngine, 'Roosevelt should make them the same if a param object is not passed in (viewEngine)')
      assert.equal(params.favicon, defaultsJSON.favicon, 'Roosevelt should make them the same if a param object is not passed in (favicon)')
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })
})
