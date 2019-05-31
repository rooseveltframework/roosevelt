const execSync = require('child_process').execSync

/**
 * check for deployment environment variable ROOSEVELT_DEPLOYMENT
 * if it exists don't install roosevelt devdeps
 * otherwise, install devdeps
 */
if (process.env.ROOSEVELT_DEPLOYMENT) {
  console.log('Skipping roosevelt dev dependencies.')
} else {
  console.log('Environment variable "ROOSEVELT_DEPLOYMENT" not set. Installing roosevelt dev dependencies.')
  execSync('npm install --only=dev --ignore-scripts', { stdio: [0, 1, 2] })
}
