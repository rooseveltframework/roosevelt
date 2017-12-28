// reads CLI flags and parses them into command object

require('colors')

const logger = require('./tools/logger')()

module.exports = function () {
  let flags = {}
  // convenience blacklist of common words to avoid when sniffing for arg chains
  let blacklist = ['-dev', '-prod', '-help']

  process.argv.forEach((arg, index, array) => {
    switch (arg) {
      // soon to be deprecated flags first
      case '-dev':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--development-mode" / "--dev" / "-d"`.yellow.bold)
        flags.developmentMode = true
        break
      case '-prod':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--production-mode" / "--prod" / "-p"`.yellow.bold)
        flags.productionMode = true
        break
      case '-cores':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--cores" / "-c"`.yellow.bold)
        flags.cores = array[index + 1]
        break
      case 'enable-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--enable-validator" / "--html-validator" / "-h"`.yellow.bold)
        flags.enableValidator = true
        break
      case 'disable-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--disable-validator" / "--raw" / "-r"`.yellow.bold)
        flags.disableValidator = true
        break
      case 'detach-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--background-validator" / -b"`.yellow.bold)
        flags.backgroundValidator = true
        break
      case 'attach-validator':
        logger.warn(`Detected use of "${arg}" command line argument. This will soon be deprecated in favor of "--attach-validator" / "-a"`.yellow.bold)
        flags.attachValidator = true
        break

      case '--development-mode':
      case '--dev':
      case '-d':
        flags.developmentMode = true
        break
      case '--production-mode':
      case '--prod':
      case '-p':
        flags.productionMode = true
        break
      case '--cores':
      case '-c':
        flags.cores = array[index + 1]
        break
      case '--enable-validator':
      case '--html-validator':
      case '-h':
        flags.enableValidator = true
        break
      case '--disable-validator':
      case '--raw':
      case '-r':
        flags.disableValidator = true
        break
      case '--background-validator':
      case '-b':
        flags.backgroundValidator = true
        break
      case '--attach-validator':
      case '-a':
        flags.attachValidator = true
        break
      default:
        if (arg.startsWith('-') && !arg.startsWith('--') && !blacklist.includes(arg)) {
          arg.split('').forEach((smallArg) => {
            switch (smallArg) {
              case 'd':
                flags.developmentMode = true
                break
              case 'p':
                flags.productionMode = true
                break
              case 'c':
                flags.cores = array[index + 1]
                break
              case 'h':
                flags.enableValidator = true
                break
              case 'r':
                flags.disableValidator = true
                break
              case 'b':
                flags.backgroundValidator = true
                break
              case 'a':
                flags.attachValidator = true
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
