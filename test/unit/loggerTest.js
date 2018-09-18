/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const path = require('path')
const util = require('util')

describe('Logger Tests', function () {
  // test package.json file
  const pkgConfig = require('../util/testPkgConfig.json')

  // test app directory
  const appDir = path.join(__dirname, '../app/loggerTest').replace('/\\/g', '/')

  // set the correct values for the package.json file
  pkgConfig.logging.appStatus = true
  pkgConfig.logging.warnings = true
  pkgConfig.logging.verbose = true

  // hook for stdout and stderr streams
  let hookStream = function (_stream, fn) {
    // reference default write method
    let oldWrite = _stream.write
    // _stream now write with our shiny function
    _stream.write = fn

    return function () {
      // reset to the default write method
      _stream.write = oldWrite
    }
  }

  // clean up the test app directory after all tests are finished
  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should initialize a logger and test many different logs', function (done) {
    // require the logger for this test
    const logger = require('../../lib/tools/logger')(pkgConfig.logging)

    // variable to store the logs
    let logs = []
    let errors = []

    // hook up standard output/errors
    let unhookStdout = hookStream(process.stdout, function (string, encoding, fd) {
      logs.push(string)
    })
    let unhookStderr = hookStream(process.stderr, function (string, encoding, fd) {
      errors.push(string)
    })

    // standard a log
    logger.log('First Test')
    logger.log('🍕', 'Pizza Emoji')
    logger.verbose('Verbose log')
    logger.custom1('Should be of type info')
    logger.custom2('Single object key type param')
    logger.custom3('Single object key enabled param')
    logger.log({ 'this': 'is an object' })

    // error logs
    logger.error('This should have an emoji prefix')
    logger.warn('This should also have an emoji prefix')
    logger.error('❤️', 'This should not add a prefix because one is already there')
    logger.custom4('This log is custom', '⚠️', 'with an emoji in the middle')

    // disabled logs
    logger.custom5('Should not have an output 1')
    logger.custom6('Should not have an output 2')

    // unhook stdout
    unhookStdout()
    unhookStderr()

    // standard log assertions
    assert.strictEqual(logs[0].includes('First Test'), true, 'The logger failed to output "First Test"')
    assert.strictEqual(logs[1].includes('🍕  Pizza Emoji'), true, 'The logger failed to output a prefixed pizza emoji')
    assert.strictEqual(logs[2].includes('Verbose log'), true, 'The logger did not output a verbose log')
    assert.strictEqual(logs[3].includes('Should be of type info'), true, 'The logger did not output a custom log')
    assert.strictEqual(logs[4].includes('Single object key type param'), true, 'The logger did not output a custom log')
    assert.strictEqual(logs[5].includes('Single object key enabled param'), true, 'The logger did not output a custom log')
    assert.strictEqual(logs[6].includes(util.inspect({ 'this': 'is an object' }, false, null, true)), true, 'The logger did not output an object')

    // error log assertions
    assert.strictEqual(errors[0].includes('❌  This should have an emoji prefix'), true, 'The logger did not automatically add an emoji to the error log')
    assert.strictEqual(errors[1].includes('⚠️  This should also have an emoji prefix'), true, 'The logger did not automatically add an emoji to the error log')
    assert.strictEqual(errors[2].includes('❤️  This should not add a prefix because one is already there'), true, 'The logger added an emoji prefix')
    assert.strictEqual(errors[3].includes('This log is custom ⚠️  with an emoji in the middle'), true, 'The logger did not output a custom log')

    // disabled log assertions
    if (typeof logs[7] !== 'undefined') {
      assert.fail('logger.custom5 output a log even though the log type is disabled')
    }
    if (typeof logs[8] !== 'undefined') {
      assert.fail('logger.custom6 output a log even though the log type is disabled')
    }

    // exit test
    done()
  })

  it('should use the defaults if no logging params are passed in', function (done) {
    // require the logger for this test
    const logger = require('../../lib/tools/logger')()

    // variable to store the logs
    let logs = []
    let errors = []

    // hook up standard output/errors
    let unhookStdout = hookStream(process.stdout, function (string, encoding, fd) {
      logs.push(string)
    })
    let unhookStderr = hookStream(process.stderr, function (string, encoding, fd) {
      errors.push(string)
    })

    // standard a log
    logger.log('First Test')
    logger.verbose('Verbose Log')

    // error logs
    logger.error('Error Log')
    logger.warn('Warning Log')

    // unhook stdout
    unhookStdout()
    unhookStderr()

    // standard log assertions
    assert.strictEqual(logs[0].includes('First Test'), true, 'The logger failed to output a log')
    assert.strictEqual(logs.length === 1, true, 'The logger output a verbose log')

    // error log assertions
    assert.strictEqual(errors[0].includes('❌  Error Log'), true, 'The logger did not output an error log')
    assert.strictEqual(errors[1].includes('⚠️  Warning Log'), true, 'The logger did not output a warning log')

    // exit test
    done()
  })

  it('should not have console output in production if disable has an array item \'production\' in the logging parameters', function (done) {
    //
    let logBool = false

    // adding disable as a parameter to disable logs on the test production app
    pkgConfig.logging.disable = ['production']

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      logging: { disable: ['production'] },
      onServerStart: `(app) => {console.log("server started")}`
    }, { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true })

    // create package.json
    fs.writeJsonSync(path.join(appDir, 'package.json'), pkgConfig)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output to kill the app when the amount of server instances equal to the amount of cores used and keep track of the amount of threads killed
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting Roosevelt Express in production mode')) {
        logBool = true
      }
      if (data.includes('server started')) {
        testApp.send('stop')
      }
    })

    // on exit, check how many instances of the app server were made, synonymous with how many cores have been used
    testApp.on('exit', () => {
      assert.strictEqual(logBool, false, 'Logs were output when they should have been suppressed')
      done()
    })
  })
})
