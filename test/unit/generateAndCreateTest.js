/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const generateAndCreateApp = require('../util/generateAndCreateApp')
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt test with execa', function () {
  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlValidatorTest')

  let GeventEmitter = generateAndCreateApp.myEmitter

  // options that would be put into generateTestApp params
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  let rooseveltParams = {
    appDir: appDir,
    generateFolderStructure: true,
    onServerStart: `(app) => {process.send(app.get("params"))}`
  }

  beforeEach(function (done) {
    fse.copySync(path.join(appDir, '../', '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
    done()
  })

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('test with execa to see how it works', function (done) {
    this.timeout(20000)

    generateAndCreateApp.startRooseveltServer(rooseveltParams, options, appDir)

    GeventEmitter.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/HTMLTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            GeventEmitter.emit('kill')
          }
          let test1 = res.text.includes('headingX')
          let test2 = res.text.includes('sentence2X')
          assert.equal(test1, true, 'Roosevelt did not send back the correct html page')
          assert.equal(test2, true, 'Roosevelt did not send back the correct html page')
          GeventEmitter.emit('kill')
        })
    })

    GeventEmitter.on('end', () => {
      done()
    })
  })
})
