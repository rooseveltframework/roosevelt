require('colors')

const Logger = require('roosevelt-logger')
const logger = new Logger()
const ps = require('ps-node')

/**
 * looks for validator and kills it when found
 * @function lookupFunction
 */
;(function lookupFunction () {
  logger.info('🔎', 'Scanning for validator now...'.yellow)
  ps.lookup({
    command: 'java',
    arguments: 'nu.validator.servlet.Main'
  }, (err, resultList) => {
    if (!err) {
      if (resultList.length === 0) {
        logger.info('🚯', 'No validator found'.yellow)
      } else {
        resultList.forEach(process => {
          logger.info('✅', `Validator successfully found with PID: ${process.pid}`.green)
          ps.kill(Number(process.pid), () => {
            logger.info('✅', `Killed process with PID: ${process.pid}`.green)
          })
        })
      }
    }
  })
})()
