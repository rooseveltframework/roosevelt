// reads CLI flags and parses them into command object

require('colors')

const logger = require('./tools/logger')()

module.exports = function () {
  let flags = {}
  // convenience blacklist of common words to avoid when sniffing for arg chains
  let blacklist = ['-dev', '-prod', '-help']

  // utility function to reference command line argument names from flag object keys
  function camelCaseToArg (str) {
    return '--' + str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()
  }

  // utility function to ensure mutually exclusive flags aren't set
  function checkFlags (flag, opposite) {
    if (!flags[opposite]) {
      flags[flag] = true
    } else {
      logger.warn(`Detected use of both "${camelCaseToArg(opposite)}" and "${camelCaseToArg(flag)}" command line arguments which are mutually exclusive. Only the first in sequence will be used.`.yellow.bold)
    }
  }

  process.argv.forEach((arg, index, array) => {
    switch (arg) {
      // soon to be deprecated flags first
      case '-dev':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--development-mode" / "--dev" / "-d"`.yellow.bold)
        checkFlags('developmentMode', 'productionMode')
        break
      case '-prod':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--production-mode" / "--prod" / "-p"`.yellow.bold)
        checkFlags('productionMode', 'developmentMode')
        break
      case '-cores':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--cores" / "-c"`.yellow.bold)
        flags.cores = array[index + 1]
        break
      case 'enable-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--enable-validator" / "--html-validator" / "-h"`.yellow.bold)
        checkFlags('enableValidator', 'disableValidator')
        break
      case 'disable-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--disable-validator" / "--raw" / "-r"`.yellow.bold)
        checkFlags('disableValidator', 'enableValidator')
        break
      case 'detach-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--background-validator" / -b"`.yellow.bold)
        checkFlags('backgroundValidator', 'attachValidator')
        break
      case 'attach-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--attach-validator" / "-a"`.yellow.bold)
        checkFlags('attachValidator', 'backgroundValidator')
        break

      case '--development-mode':
      case '--dev':
      case '-d':
        checkFlags('developmentMode', 'productionMode')
        break
      case '--production-mode':
      case '--prod':
      case '-p':
        checkFlags('productionMode', 'developmentMode')
        break
      case '--cores':
      case '-c':
        flags.cores = array[index + 1]
        break
      case '--enable-validator':
      case '--html-validator':
      case '-h':
        checkFlags('enableValidator', 'disableValidator')
        break
      case '--disable-validator':
      case '--raw':
      case '-r':
        checkFlags('disableValidator', 'enableValidator')
        break
      case '--background-validator':
      case '-b':
        checkFlags('backgroundValidator', 'attachValidator')
        break
      case '--attach-validator':
      case '-a':
        checkFlags('attachValidator', 'backgroundValidator')
        break
      default:
        if (arg.startsWith('-') && !arg.startsWith('--') && !blacklist.includes(arg)) {
          arg.split('').forEach((smallArg) => {
            switch (smallArg) {
              case 'd':
                checkFlags('developmentMode', 'productionMode')
                break
              case 'p':
                checkFlags('productionMode', 'developmentMode')
                break
              case 'c':
                flags.cores = array[index + 1]
                break
              case 'h':
                checkFlags('enableValidator', 'disableValidator')
                break
              case 'r':
                checkFlags('disableValidator', 'enableValidator')
                break
              case 'b':
                checkFlags('backgroundValidator', 'attachValidator')
                break
              case 'a':
                checkFlags('attachValidator', 'backgroundValidator')
                break
            }
          })
        } else if (arg.startsWith('-') || arg.startsWith('--')) {
          logger.warn(`Detected use of unrecognized argument ${arg}. See https://github.com/rooseveltframework/roosevelt#other-useful-scripts for a list of supported arguments.`.yellow.bold)
        }
        break
    }
  })

  return flags
}
