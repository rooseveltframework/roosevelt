/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const generateAndCreateApp = require('../util/generateAndCreateApp')
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt test with new consolidated generate and fork', function () {
  this.timeout(10000)
  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlValidatorTest')

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
        generateAndCreateApp.deleteAndCreateEventEmitter()
        done()
      }
    })
  })

  it('HTML Test 1', function (done) {
    let GeventEmitter = generateAndCreateApp.getEmitter()

    generateAndCreateApp.startRooseveltServer(rooseveltParams, options, appDir, false, false)

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

  it('HTML Test 2', function (done) {
    let GeventEmitter2 = generateAndCreateApp.getEmitter()

    generateAndCreateApp.startRooseveltServer(rooseveltParams, options, appDir, false, false)

    GeventEmitter2.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/serverError')
        .expect(500, (err, res) => {
          if (err) {
            assert.fail(err)
            GeventEmitter2.emit('kill')
          }
          let test1 = res.text.includes('500 Internal Server Error')
          let test2 = res.text.includes('temporarily unavailable at this time')
          assert.equal(test1, true, 'Roosevelt did not send back the correct html error page')
          assert.equal(test2, true, 'Roosevelt did not send back the correct html error page')
          GeventEmitter2.emit('kill')
        })
    })

    GeventEmitter2.on('end', () => {
      done()
    })
  })

  it('Test 3 (MVC Check)', function (done) {
    let GeventEmitter3 = generateAndCreateApp.getEmitter()

    generateAndCreateApp.startRooseveltServer(rooseveltParams, options, appDir, false, false)

    GeventEmitter3.on('message', () => {
      let test1 = fse.existsSync(path.join(appDir, 'mvc'))
      let test2 = fse.existsSync(path.join(appDir, 'public'))
      let test3 = fse.existsSync(path.join(appDir, 'statics'))
      assert.equal(test1, true, 'Roosevelt did not make a mvc folder')
      assert.equal(test2, true, 'Roosevelt did not make a public folder')
      assert.equal(test3, true, 'Roosevelt did not make a statics folder')
      GeventEmitter3.emit('kill')
    })

    GeventEmitter3.on('end', () => {
      done()
    })
  })
})
