/* eslint-env mocha */

const assert = require('assert')
const util = require('util')

describe('Logger Tests', function () {
  // test package.json file
  const pkgConfig = require('../util/testPkgConfig.json')
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
    logger.log({'this': 'is an object'})

    // error logs
    logger.error('This should have an emoji prefix')
    logger.warn('This should also have an emoji prefix')
    logger.error('❤️', 'This should not add a prefix because one is already there')
    logger.custom4('This log is custom', '⚠️', 'with an emoji in the middle')

    // unhook stdout
    unhookStdout()
    unhookStderr()

    // standard log assertions
    assert.equal(logs[0].includes('First Test'), true, 'The logger failed to output "First Test"')
    assert.equal(logs[1].includes('🍕   Pizza Emoji'), true, 'The logger failed to output a prefixed pizza emoji')
    assert.equal(logs[2].includes('Verbose log'), true, 'Roosevelt did not output a verbose log')
    assert.equal(logs[3].includes('Should be of type info'), true, 'Roosevelt did not output a custom log')
    assert.equal(logs[4].includes('Single object key type param'), true, 'Roosevelt did not output a custom log')
    assert.equal(logs[5].includes('Single object key enabled param'), true, 'Roosevelt did not output a custom log')
    assert.equal(logs[6].includes(util.inspect({'this': 'is an object'}, false, null, true)), true, 'Roosevelt did not output an object')

    // error log assertions
    assert.equal(errors[0].includes('❌   This should have an emoji prefix'), true, 'The logger did not automatically add an emoji to the error log')
    assert.equal(errors[1].includes('⚠️   This should also have an emoji prefix'), true, 'The logger did not automatically add an emoji to the error log')
    assert.equal(errors[2].includes('❤️   This should not add a prefix because one is already there'), true, 'The logger added an emoji prefix')
    assert.equal(errors[3].includes('This log is custom', '⚠️', 'with an emoji in the middle'), true, 'Roosevelt did not output a custom log')

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
    assert.equal(logs[0].includes('First Test'), true, 'The logger failed to output a log')
    assert.equal(logs.length === 1, true, 'The logger output a verbose log')

    // error log assertions
    assert.equal(errors[0].includes('❌   Error Log'), true, 'The logger did not output an error log')
    assert.equal(errors[1].includes('⚠️   Warning Log'), true, 'The logger did not output a warning log')

    // exit test
    done()
  })
})
