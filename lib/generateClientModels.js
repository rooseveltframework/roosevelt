// writes a frontend counterpart for each model the server has, so an isomorphic controller can require the same model name on both sides
//
// what it writes is the rote part: one file per model that hands off to `_defaultModel`, which is the app's own single file saying what reaching its api means
//
// so an app writes one file instead of one per model, and roosevelt writes nothing an app would want to read: `_defaultModel` lives in the app's js source path where it can be edited, not in the build folder
//
// an app that needs something different for a particular model writes its own model in its js source path, which every bundler searches before the build folder, so the hand written one wins and the generated one is never reached
require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const walk = require('./tools/walkFiles')
const matchingFiles = require('./tools/matchingFiles')
const docsUrl = require('./tools/docsUrl')

module.exports = async app => {
  const fsr = require('./tools/fsr')(app)
  const buildCache = app.get('buildCache') || require('./tools/buildCache')(app)
  const appName = app.get('appName')
  const logger = app.get('logger')
  const modelsPath = app.get('modelsPath')
  const params = app.get('params')
  const { enable, exposeAll, allowlist, blocklist, output, apiRoute } = params.clientModels

  // the shared helper every generated model calls, which is what an app writes its own copy of to change all of them at once the leading underscore keeps it clear of anything an app would name a model
  const helper = '_defaultModel.js'
  const helperModule = '_defaultModel'
  const ownModelsPath = path.posix.join(path.relative(app.get('appDir'), params.js.sourcePath).split(path.sep).join('/'), 'models')

  if (!enable || !params.makeBuildArtifacts) return
  if (!fs.pathExistsSync(modelsPath)) return

  // the param's list first, then any model that marks itself with a comment on its first line, the same way a controller does
  const finalBlocklist = new Set([...blocklist, helper]) // a model must never be generated over the helper's own name
  const allModels = await walk(modelsPath)
  for (const file of allModels) {
    const modelName = path.relative(modelsPath, file).replace(/\\/g, '/') // windows fix
    try {
      if (fs.readFileSync(file, 'utf8').trim().split('\n')[0].includes('roosevelt-blocklist')) finalBlocklist.add(modelName)
    } catch {
      // a model that cannot be read cannot be exposed either, so it is left out rather than guessed about
      finalBlocklist.add(modelName)
    }
  }

  // an allowlist names what to expose; otherwise exposeAll decides whether everything is
  const patterns = allowlist.length ? allowlist : (exposeAll ? ['**/*.js'] : [])
  if (!patterns.length) return

  const models = matchingFiles(patterns, modelsPath, [...finalBlocklist])
  if (!models.length) return

  if (!fs.pathExistsSync(path.join(params.js.sourcePath, 'models', helper))) {
    logger.warn(`${appName} is generating front end models that call ${path.posix.join(ownModelsPath, helper)}, which does not exist yet. Create it to say what reaching your API means, or your bundler will fail to resolve it. See ${docsUrl}/config-isomorphic for an example.`)
  }

  for (const file of models) {
    try {
      const modelName = file.replace(/\\/g, '/').replace(/\.js$/, '')
      const source = path.join(modelsPath, file)
      const writePath = path.join(output, file)

      // the model itself is the only source, since what gets written is derived from its name rather than its contents
      //
      // it is still a source, so that deleting the model stops the generated one from being counted as fresh
      if (buildCache.isFresh(writePath, [source])) continue

      const fileDataToWrite = `/* Do not edit; generated automatically by Roosevelt */

// the frontend counterpart to ${modelName}
//
// to change just this one, write your own ${path.posix.join(ownModelsPath, file.replace(/\\/g, '/'))}
//
// to change how every auto-generated model works, write your own ${path.posix.join(ownModelsPath, helper)}

const defaultModel = require('models/${helperModule}')

module.exports = async (...args) => defaultModel({ model: '${modelName}', route: '${path.posix.join(apiRoute, modelName)}' }, ...args)
`

      let oldFileData
      try {
        oldFileData = fs.readFileSync(writePath, 'utf8')
      } catch {
        oldFileData = ''
      }
      if (oldFileData !== fileDataToWrite) fsr.writeFileSync(writePath, fileDataToWrite, ['📝', `${appName} writing new JS file ${writePath}`.green])
      buildCache.record(writePath, { outputs: writePath, sources: [source] })
    } catch (err) {
      logger.error(`${appName} failed to generate a front end model for ${file}.`)
      logger.error(err)
    }
  }
}
