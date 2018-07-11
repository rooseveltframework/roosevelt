require('colors')

const ps = require('ps-node')
const fkill = require('fkill')
const logger = require('../tools/logger')()

/**
 * looks for validator and kills it when found
 * @function lookupValidator
 */
function lookupValidator () {
  logger.log('Scanning for validator now...'.yellow)
  ps.lookup({
    command: 'java',
    arguments: 'nu.validator.servlet.Main'
  }, function (err, resultList) {
    if (err) {
      // throw new Error(err);
    }
    if (resultList.length === 0) {
      logger.error('Could not find the validator at this time, please make sure that the validator is running.'.red)
      process.exit()
    }
    resultList.forEach(function (process) {
      if (process) {
        logger.log('✔️', `Validator successfully found with PID: ${process.pid}`.green)
        fkill(`${process.pid}`, {force: true}).then(() => {
          logger.log('✔️', `Killed process with PID: ${process.pid}`.green)
        })
      }
    })
  })
  // logger.log('Found and closed all validators at the moment, exiting killValidator'.green)
}
lookupValidator()
