const execSync = require('child_process').execSync
const Logger = require('roosevelt-logger')
const logger = new Logger()

/**
 * check for deployment environment variable ROOSEVELT_DEPLOYMENT
 * if it exists don't install roosevelt devdeps
 * otherwise, install devdeps
 */
if (process.env.ROOSEVELT_DEPLOYMENT) {
  logger.log('⏩', 'Skipping roosevelt dev dependencies.'.yellow)
} else {
  logger.log('Environment variable'.bold, 'ROOSEVELT_DEPLOYMENT'.red, 'not set. Installing roosevelt dev dependencies.'.bold)
  try {
    execSync('npm install --only=dev --ignore-scripts', { stdio: [0, 1, 2] })
    logger.log('✅', 'Installed dev dependencies.'.green)
  } catch (e) {
    logger.error(`${e}`.red.bold)
  }
}
