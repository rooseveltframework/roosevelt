require('colors')
const execSync = require('child_process').execSync
const Logger = require('roosevelt-logger')
const logger = new Logger()

/**
 * check for deployment environment variable ROOSEVELT_DEPLOYMENT
 * if it exists don't install Roosevelt devDeps
 * otherwise, install devDeps
 */
if (process.env.ROOSEVELT_DEPLOYMENT) {
  logger.warn('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" is set. Skipping installation of Roosevelt devDependencies. You may not be able to run Roosevelt in development mode unless you run `npm run dev-install`')
} else {
  logger.log('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" not set. Installing Roosevelt\'s devDependencies...')
  try {
    execSync('npm install --only=dev --ignore-scripts', { stdio: [0, 1, 2] })
    logger.log('✅', 'Installed Roosevelt\'s devDependencies to support using Roosevelt in development mode. You can remove Roosevelt\'s devDependencies by running `npm run dev-prune` to shrink production builds.'.green)
  } catch (e) {
    logger.error(`${e}`)
  }
}
