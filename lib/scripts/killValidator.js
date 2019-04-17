require('colors')

const ps = require('ps-node')
const fkill = require('fkill')
const logger = require('roosevelt-logger')()

/**
 * looks for validator and kills it when found
 * @function lookupFunction
 */
;(function lookupFunction () {
  logger.info('🔎', 'Scanning for validator now...'.yellow)
  ps.lookup({
    command: 'java',
    arguments: 'nu.validator.servlet.Main'
  }, function (err, resultList) {
    if (!err) {
      if (resultList.length === 0) {
        logger.error('Could not find the validator at this time, please make sure that the validator is running.'.red)
        process.exit()
      } else {
        resultList.forEach(function (process) {
          logger.info('✅', `Validator successfully found with PID: ${process.pid}`.green)
          fkill(Number(process.pid), { force: true }).then(() => {
            logger.info('✅', `Killed process with PID: ${process.pid}`.green)
          })
        })
      }
    }
  })
})()
