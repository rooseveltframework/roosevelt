// expose controllers that are available on the server down to the client as well
require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const { walk } = require('@nodelib/fs.walk/promises')
const { globSync } = require('glob')

module.exports = async app => {
  const fsr = require('./tools/fsr')(app)
  const appName = app.get('appName')
  const logger = app.get('logger')
  const controllersPath = app.get('controllersPath')
  const { exposeAll, enable, allowlist, blocklist, defaultBundle } = app.get('params').clientControllers

  if (!enable || !app.get('params').makeBuildArtifacts) return

  const bundles = Object.assign({}, allowlist)
  const finalBlocklist = new Set(blocklist) // populate this first by pulling the param, then merging in any additionals found, this is a set to prevent dupes implicitly

  // examine all files in the controllers directory and determine any allow/blocklist changes based on file decorator comments
  const allControllersFiles = (await walk(controllersPath, { stats: true, entryFilter: item => !finalBlocklist.has(item.path) && !item.stats.isDirectory() })).map(file => file.path)
  const allowlistRegex = /\/\/\s*roosevelt-allowlist\s*([\w-/.]+\.?(js)?)\s*/ // regular expression to grab filename from `// roosevelt-allowlist` tags
  for (const file of allControllersFiles) {
    const controllerName = path.relative(controllersPath, file).replace(/\\/g, '/') // windows fix
    const contents = fs.readFileSync(file, 'utf8').trim()
    const controllerComment = contents.split('\n')[0]
    if (controllerComment.includes('roosevelt-blocklist')) {
      finalBlocklist.add(controllerName)
    } else if (controllerComment.includes('roosevelt-allowlist')) {
      const regexMatch = allowlistRegex.exec(controllerComment)
      if (regexMatch) {
        const bundleNameFromComment = regexMatch[1]
        if (!bundles[bundleNameFromComment]) bundles[bundleNameFromComment] = [controllerName]
        else bundles[bundleNameFromComment].push(controllerName)
      }
    }
  }

  // expose all controllers if allowlist is empty and exposeAll is enabled
  if (exposeAll && !Object.keys(bundles).length) bundles[defaultBundle] = '**/**'

  // run through the bundle configuration and build
  for (const bundleName of Object.keys(bundles)) {
    try {
      const bundleGlob = bundles[bundleName]
      const bundleFiles = globSync(bundleGlob, { nodir: true, ignore: [...finalBlocklist], cwd: controllersPath })
      const writePath = path.join(app.get('clientControllersBundledOutput'), bundleName)
      let fileDataToWrite = `/* Do not edit; generated automatically by Roosevelt */

module.exports = (router, app) => {
  app = app || router
`
      for (const file of bundleFiles) fileDataToWrite += '  require(\'' + file.replaceAll('\\', '\\\\') + '\')(router, app)\n'
      fileDataToWrite += '}\n'
      let oldFileData
      try {
        oldFileData = fs.readFileSync(writePath, 'utf8')
      } catch (e) {
        oldFileData = ''
      }
      if (oldFileData !== fileDataToWrite) fsr.writeFileSync(writePath, fileDataToWrite, ['📝', `${appName} writing new JS file ${writePath}`.green])
    } catch (err) {
      logger.error(`Failed to create controller bundle with the following configuration! ${bundles}`)
      logger.error(err)
    }
  }
}
