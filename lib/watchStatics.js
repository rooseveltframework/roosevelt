require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')
const wildcardMatch = require('./tools/wildcardMatch')
const gitignoreScanner = require('./tools/gitignoreScanner')

// rebuilds the static files whenever one of the files they are built from is edited, then tells the browser to reload
//
// this only runs in development mode, and only when roosevelt is building static files at all
// it does not watch controllers or models: changing those means restarting the process, which is what a process watcher is for, and roosevelt cannot reload code it has already required
module.exports = app => {
  const params = app.get('params')
  const logger = app.get('logger')
  const appName = app.get('appName')

  if (app.get('env') !== 'development' || !params.makeBuildArtifacts || !params.watchStatics.enable) return

  // the directories the static files are built from
  // duplicates and paths that do not exist are dropped, since one recursive watcher on a parent already covers its children
  const watched = pruneRedundant([
    params.staticsRoot,
    params.html.sourcePath,
    params.css.sourcePath,
    params.js.sourcePath,
    params.viewsPath,
    ...params.watchStatics.additionalPaths.map(dir => path.isAbsolute(dir) ? dir : path.join(app.get('appDir'), dir))
  ])

  if (!watched.length) return

  // anything roosevelt writes is skipped, or building would trip the watcher and build again forever
  const ignored = [params.publicFolder, params.buildFolder].filter(Boolean)

  // a file the app would not commit is not a file it builds from either
  // this is the same list the static page generator already skips: roosevelt's own, plus whatever the app's .gitignore
  // names, which is what keeps the .DS_Store macos drops into a folder from starting a rebuild
  const ignoredNames = gitignoreScanner(path.join(app.get('appDir'), '.gitignore'))

  const edited = new Set()
  const watchers = []
  let rebuilding = false
  let debounce = null

  for (const dir of watched) {
    try {
      watchers.push(fs.watch(dir, { recursive: true }, (event, file) => {
        if (!file) return
        const changed = path.join(dir, file)
        if (ignored.some(skip => changed === skip || changed.startsWith(skip + path.sep))) return

        // every part of the path is checked, not just the file name, so an ignored folder covers what is inside it
        // the path is the one relative to the folder being watched, so an app living in a directory that happens to share a name with an ignored one is not ignored wholesale
        if (file.split(path.sep).some(segment => ignoredNames.includes(segment))) return
        edited.add(changed)
        clearTimeout(debounce)
        debounce = setTimeout(rebuild, params.watchStatics.debounce ?? 100) // saving one file reports more than one event, so let a burst finish arriving
      }))
    } catch (err) {
      // watching is a convenience, so an app that cannot watch still runs; the most likely cause is a platform limit on how many files can be watched at once
      logger.warn(`${appName} could not watch ${dir} for changes, so its static files will not be rebuilt as you edit them: ${err.message}`)
    }
  }

  if (!watchers.length) return

  // stop watching when the app shuts down, or a rebuild would fire against an app that is no longer listening
  app.set('staticsWatchers', watchers)

  logger.info('👀', `${appName} is watching for changes to the files your static files are built from`.cyan)

  async function rebuild () {
    if (rebuilding || !edited.size) return
    rebuilding = true
    const files = [...edited]
    edited.clear() // anything edited from here on is picked up by the next pass rather than dropped

    logger.info('🔄', `${appName} rebuilding static files because ${files.length === 1 ? `${files[0]} changed` : `${files.length} files changed`}`.cyan)

    try {
      await require('./buildStatics')(app, { pages: pagesAffectedBy(app, files, watched) })

      // fire user-defined onStaticsRebuilt event
      // an app whose build does more than roosevelt's own steps, such as writing a search index, does that work here
      if (params.onStaticsRebuilt && typeof params.onStaticsRebuilt === 'function') await Promise.resolve(params.onStaticsRebuilt(app, files))

      reloadBrowsers(app)
    } catch (err) {
      // a failed rebuild leaves the app running, so the next save can fix it
      logger.error(`${appName} failed to rebuild its static files: ${err.message}`)
      logger.error(err)
    }

    rebuilding = false
    if (edited.size) rebuild() // more arrived while that was running
  }
}

// works out which static pages the edited files affect, so a rebuild renders those rather than all of them
//
// roosevelt cannot ask a view engine which templates a page included, so it has no way of knowing which pages a shared template belongs to; what it can tell is whether an edited template is a page in its own right, and a template that is not is one that pages include, so a change to one of those renders every page again
//
// returns undefined to mean every page, or the list of pages to render, relative to the html source path the way the allowlist param is
function pagesAffectedBy (app, files, watched) {
  const params = app.get('params')
  const sourcePath = params.html.sourcePath
  if (!sourcePath) return undefined

  const pages = new Set()

  for (const file of files) {
    const changed = path.resolve(file)

    if (!inside(changed, sourcePath)) {
      // something roosevelt watches that no page is built from, such as a stylesheet or an image
      if (watched.some(dir => inside(changed, dir))) continue

      // a path that cannot be placed under anything roosevelt watches, which means it cannot be reasoned about either
      // rather than assume no page depends on it, which would leave pages stale with nothing to say so, render them all
      return undefined
    }

    // a file that has been deleted or renamed cannot be examined, so nothing can be ruled out
    if (!fs.pathExistsSync(changed)) return undefined

    const extension = path.extname(changed).slice(1)

    // a model belongs to the page beside it that shares its name
    if (extension === 'js' || extension === 'json') {
      const beside = pagesBesideModel(app, changed)
      if (!beside.length) return undefined // a model that belongs to no page of its own could be feeding all of them
      for (const page of beside) pages.add(page)
      continue
    }

    // a file type no view engine is registered for is not a page, so what depends on it is anyone's guess
    if (!app.get('view: ' + extension)) return undefined

    // the marker an app puts on a template to keep it from being served as a page of its own, which is what a layout or a partial carries
    if (firstLineBlocklists(changed)) return undefined

    const baseFile = path.relative(sourcePath, changed)
    const { allowlist, blocklist } = params.html
    if ((allowlist?.length && !wildcardMatch(baseFile, allowlist)) || (blocklist?.length && wildcardMatch(baseFile, blocklist))) return undefined

    pages.add(baseFile)
  }

  return [...pages]
}

// whether a path is a directory or something within it
function inside (target, dir) {
  return target === dir || target.startsWith(dir + path.sep)
}

// the pages sitting next to a model file that share its name, which are the pages that model supplies
function pagesBesideModel (app, modelFile) {
  const { dir, name } = path.parse(modelFile)
  const sourcePath = app.get('params').html.sourcePath

  try {
    return fs.readdirSync(dir)
      .filter(entry => entry !== path.basename(modelFile) && path.parse(entry).name === name)
      .filter(entry => app.get('view: ' + path.extname(entry).slice(1)))
      .map(entry => path.relative(sourcePath, path.join(dir, entry)))
  } catch {
    return [] // the directory cannot be read, so treat the model as belonging to no one page
  }
}

// the same first line marker the page generator itself honors to keep a template from being written out as a page
function firstLineBlocklists (file) {
  try {
    return fs.readFileSync(file, 'utf8').trim().split('\n')[0].includes('roosevelt-blocklist')
  } catch {
    return true // unreadable, so it cannot be ruled out as something every page depends on
  }
}

// the reload script in the browser reconnects and reloads the page when its socket closes, which is how it notices a restarted app; closing the sockets by hand is what lets a rebuild reload the page without the process going down
function reloadBrowsers (app) {
  const sockets = app.get('reloadSockets')
  if (!sockets) return
  for (const socket of sockets) socket.destroy()
  sockets.clear()
}

// a recursive watcher on a directory already covers everything inside it, so nested paths are dropped
function pruneRedundant (dirs) {
  const existing = [...new Set(dirs.filter(dir => dir && fs.pathExistsSync(dir)).map(dir => path.resolve(dir)))]
  return existing.filter(dir => !existing.some(other => other !== dir && dir.startsWith(other + path.sep)))
}

module.exports.reloadBrowsers = reloadBrowsers
module.exports.pagesAffectedBy = pagesAffectedBy // exported so the test suite can check the decision on its own, without depending on the platform reporting a file change
