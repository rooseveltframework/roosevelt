// reads CLI flags and parses them into command object

require('colors')

const logger = require('./tools/logger')()

module.exports = function (enableCLIFlags) {
  // ignore flags if enableCLIFlags param is false
  if (!enableCLIFlags) {
    return {}
  }

  let commandLineArgs = process.argv.slice(2)
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
      logger.warn(`Detected use of both "${camelCaseToArg(opposite)}" and "${camelCaseToArg(flag)}" command line arguments which are mutually exclusive. Only the first in sequence will be used.`.yellow)
    }
  }

  commandLineArgs.forEach((arg, index, array) => {
    switch (arg) {
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
      case '--enable-validator-autokiller':
      case '--html-validator-autokiller':
      case '-k':
        checkFlags('enableAutokiller', 'disableAutokiller')
        break
      case '--disable-validator-autokiller':
      case '--no-autokiller':
      case '-n':
        checkFlags('disableAutokiller', 'enableAutokiller')
        break
      case '--host-public':
      case '--statics':
      case '-s':
        checkFlags('alwaysHostPublic')
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
              case 'k':
                checkFlags('enableAutokiller', 'disableAutokiller')
                break
              case 'n':
                checkFlags('disableAutokiller', 'enableAutokiller')
                break
            }
          })
        }
        break
    }
  })

  return flags
}
