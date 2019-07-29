require('colors')
const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs')
const Logger = require('roosevelt-logger')
const logger = new Logger()

// check in app directory if Roosevelt is a dev dependency
const pkgPath = path.join(process.cwd(), '../../package.json')
let isRooseveltDevDep
let isRooseveltDep
if (fs.existsSync(pkgPath)) {
  const pkg = require(pkgPath)
  isRooseveltDevDep = pkg.devDependencies.roosevelt
  isRooseveltDep = pkg.dependencies.roosevelt
}

// check if Roosevelt's devDeps are already installed to avoid infinite postinstalls
let areDevDepsInstalled = true
const rooseveltPkgPath = path.join(process.cwd(), 'package.json')
const rooseveltNodeModulesPath = path.join(process.cwd(), 'node_modules')
if (fs.existsSync(rooseveltPkgPath)) {
  const devDeps = require(rooseveltPkgPath).devDependencies
  const devDepsKeys = Object.keys(devDeps)
  if (devDepsKeys.length > 0) {
    const devDepPath = path.join(rooseveltNodeModulesPath, devDepsKeys[0])
    areDevDepsInstalled = fs.existsSync(devDepPath)
  }
}

// Get the arguments from the npm install command
const parsedArgs = JSON.parse(process.env.npm_config_argv)
const installArgs = [...parsedArgs.cooked]

/**
 * check for deployment environment variable ROOSEVELT_DEPLOYMENT or if the `only` install command flag is set to production
 * if it exists don't install Roosevelt devDeps
 * otherwise, install devDeps as long as the following criteria are met:
 * - Roosevelt isn't a devDep but is a direct dependency
 * - Roosevelt's dev dependencies aren't already installed
 */
if (process.env.ROOSEVELT_DEPLOYMENT) {
  logger.warn('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" is set. Skipping installation of Roosevelt devDependencies. You may not be able to run Roosevelt in development mode unless you run `npm run dev-install`')
} else if (installArgs.includes('prod') || installArgs.includes('production')) {
  logger.warn('📦', 'NPM flag `--only` is set to production. Skipping installation of Roosevelt devDependencies. You may not be able to run Roosevelt in development mode unless you run `npm run dev-install`')
} else if (isRooseveltDevDep === undefined && isRooseveltDep !== undefined && !areDevDepsInstalled) {
  logger.log('📦', 'Environment variable "ROOSEVELT_DEPLOYMENT" not set. Installing Roosevelt\'s devDependencies...')
  try {
    execSync('npm install --only=dev', { stdio: 'inherit' })
    logger.log('✅', 'Installed Roosevelt\'s devDependencies to support using Roosevelt in development mode. You can remove Roosevelt\'s devDependencies by running `npm run dev-prune` to shrink production builds.'.green)
  } catch (e) {
    logger.error(e)
  }
}
