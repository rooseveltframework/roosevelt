const Logger = require('roosevelt-logger')
const logger = new Logger()
const fs = require('fs-extra')
const path = require('path')

module.exports = (options, params) => {
  try {
    const { dependencies } = require(path.join(params.appDir, 'package.json'))
    let cfg = {}
    if (fs.existsSync(path.join(params.appDir, 'rooseveltConfig.json'))) cfg = require(path.join(params.appDir, 'rooseveltConfig.json'))
    else if (fs.existsSync(path.join(params.appDir, 'roosevelt.config.json'))) cfg = require(path.join(params.appDir, 'roosevelt.config.json'))
    const suppliedOptions = { ...cfg, ...options }

    if (suppliedOptions.generateFolderStructure) logger.error('The `generateFolderStructure` param renamed to `makeBuildArtifacts`. You will need to update your Roosevelt config.')
    if (suppliedOptions.htmlMinifier) logger.error('The `htmlMinifier` param renamed and expanded to `html`. You will need to update your Roosevelt config.')
    if (suppliedOptions.cores) logger.error('The `cores` feature was removed in 0.23.0 since is largely redundant now thanks to the widespread popularity of tools like pm2.')
    if (suppliedOptions.toobusy) logger.error('The `toobusy` feature was removed in 0.23.2 since it is temperamental and the dependency is no longer maintained.')
    if (suppliedOptions.clientViews && typeof suppliedOptions.clientViews?.enable !== 'boolean') logger.error('You need to add an `enable` param to `clientViews`.')
    if (suppliedOptions.onReqAfterRoute) logger.error('The `onReqAfterRoute` method was removed in 0.24.0. Use Express middleware instead.')
    if (suppliedOptions.onReqBeforeRoute) logger.error('The `onReqBeforeRoute` method was removed in 0.24.0. Use Express middleware instead.')
    if (suppliedOptions.onReqStart) logger.error('The `onReqStart` method was removed in 0.24.0. Use Express middleware instead.')
    if (suppliedOptions.onStaticAssetsGenerated) logger.error('The `onStaticAssetsGenerated` method was removed in 0.24.0. Use `onServerInit` instead.')
    if (suppliedOptions.isomorphicControllers) logger.error('Replaced `isomorphicControllers` param with `clientControllers` param and made it function similarly to `clientViews`. See 0.26.1 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.26.1')
    if (suppliedOptions.secretsDir) logger.error('The `secretsDir` param was renamed to `secretsPath`')
    if (suppliedOptions.port) logger.error('The `port` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0')
    if (suppliedOptions.https?.force) logger.error('The `https.force` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0')
    if (suppliedOptions.https?.authInfoPath) logger.error('The `https.authInfoPath` param was deprecated. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0')
    if (suppliedOptions.js?.webpack?.bundles) {
      for (const bundle of params.js.webpack.bundles) {
        if (bundle.env === 'dev' || bundle.env === 'prod') logger.error('The `js.webpack.bundles.env` param now only accepts `development` or `production` as values. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0')
        if (bundle.env === 'verbose') logger.error('The `js.webpack.bundles.verbose` param was moved to `js.verbose`. See 0.27.0 release notes for migration details: https://github.com/rooseveltframework/roosevelt/releases/tag/0.27.0')
      }
    }
    if (!dependencies.webpack && suppliedOptions.js?.webpack) logger.error('You need to add `webpack` to your dependencies.')
    if (process.argv.includes('--webpack=')) logger.error('--webpack flag is now --jsbundler')
    if (process.argv.includes('--wp=')) logger.error('--wp flag is now --jsb')
    if (process.argv.includes('--w=')) logger.error('--w flag is now --j')
  } catch {}
}
