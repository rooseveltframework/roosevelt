const execa = require('execa')
const path = require('path')
const ps = require('ps-node')
const timeout = process.argv[2]
const Logger = require('roosevelt-logger')
const logger = new Logger({
  methods: {
    verbose: process.argv[3] === 'true'
  }
})

logger.verbose(`Starting the validator autokiller, going to kill the validator in ${timeout / 1000} seconds if the app is not in use anymore`)

// check if a roosevelt app is open per user specified interval
const checkInterval = setInterval(() => {
  logger.verbose('Checking that a Roosevelt app is running...')

  // scan for roosevelt processes by sniffing for node processes ran with "--development-mode" argument
  ps.lookup({
    command: 'node',
    arguments: '--development-mode'
  }, (err, processList) => {
    // lack of populated results indicates that no roosevelt app is running
    if (!err && !processList[0]) {
      // clear the interval
      clearInterval(checkInterval)

      // spin up the validator killer script
      const killValidator = execa('node', [path.join(`${__dirname}/killValidator.js`)], { stdio: 'pipe', shell: false, windowsHide: true })

      // log the validator killer output
      killValidator.stdout.on('data', data => {
        logger.verbose(data.toString())
      })
    }
  })
}, timeout)
