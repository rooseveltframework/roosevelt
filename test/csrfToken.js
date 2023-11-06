/* eslint-env mocha */

const assert = require('assert')
const appCleaner = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')
const getcsrfAttack = require('./../test/util/csrfAttack')

describe('form pages', function () {
  const appDir = path.join(__dirname, 'app/errorPages')
  // options to pass into test app generator
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc directory into the test app directory for each test
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  afterEach(function (done) {
    // clean up the test app directory after each test
    appCleaner(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should render the form test page', function (done) {
    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      viewEngine: [
        'html: teddy'
      ],
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request the test page
    testApp.on('message', () => {
      request('http://localhost:43711')
        .get('/form')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
            done()
          }
          // test that the values rendered on the page are correct
          const test1 = res.text.includes('CSRF Test')
          const test2 = res.text.includes('Login Form')
          const test3 = res.text.includes('User Name:')
          const test4 = res.text.includes('Password:')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, true)
          assert.strictEqual(test4, true)
          testApp.send('stop')
        })

      //   when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })

  it.only('should render', function (done) {
    // generate the test app
    // generateTestApp({
    //   appDir,
    //   makeBuildArtifacts: true,
    //   viewEngine: [
    //     'html: teddy'
    //   ],
    //   onServerStart: '(app) => {process.send(app.get("params"))}'
    // }, options)

    // fork and run app.js as a child process
    getcsrfAttack.csrfAttack()
    const attackApp = fork('./csrfAttack/csrfExpress.js', { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })
    console.log(attackApp)
    attackApp.on('message', () => {
      request('http://localhost:3001')
        .post('form')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            // attackApp.send('stop')
            done()
          }
          const test1 = res.text.includes('Congratulations. You just won a bonus of 1 million dollars!!')
          assert.strictEqual(test1, true)
          // attackApp.send('stop')
        })
    })
    done()
  })
})
