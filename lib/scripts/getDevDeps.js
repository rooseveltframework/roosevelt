require('colors')
const execSync = require('child_process').execSync
const path = require('path')
const Logger = require('roosevelt-logger')
const logger = new Logger()

// check in app directory if Roosevelt is a dev dependency
let pkgPath = path.join(process.cwd(), '../../package.json')
let isRooseveltDevDep = require(pkgPath).devDependencies.roosevelt

/**
 * check for deployment environment variable ROOSEVELT_DEPLOYMENT
 * if it exists don't install Roosevelt devDeps
 * otherwise, install devDeps as long as Roosevelt itself isn't a devDep
 */
if (process.env.ROOSEVELT_DEPLOYMENT) {
  logger.warn('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" is set. Skipping installation of Roosevelt devDependencies. You may not be able to run Roosevelt in development mode unless you run `npm run dev-install`')
} else if (!isRooseveltDevDep) {
  logger.log('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" not set. Installing Roosevelt\'s devDependencies...')
  try {
    execSync('npm install --only=dev --ignore-scripts', { stdio: ['inherit', 'inherit', 'inherit'] })
    logger.log('✅', 'Installed Roosevelt\'s devDependencies to support using Roosevelt in development mode. You can remove Roosevelt\'s devDependencies by running `npm run dev-prune` to shrink production builds.'.green)
  } catch (e) {
    logger.error(e)
  }
}
