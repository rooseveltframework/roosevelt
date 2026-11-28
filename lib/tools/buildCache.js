// internal roosevelt build cache module
//
// remembers which files each static file was built from, so the ones that did not change can be skipped on the next run
//
// file contents are compared rather than timestamps, so copying or checking out a file does not cause a needless rebuild, and a file edited without its timestamp changing is still caught

const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const url = require('url')
require('@colors/colors')

module.exports = app => {
  const params = app.get('params')
  const cacheFile = path.join(params.buildFolder, 'buildCache.json')
  let cache = { fingerprint: null, artifacts: {} }
  let dirty = false

  // everything apart from the source files that can change what gets built, so that editing config or upgrading roosevelt rebuilds everything
  //
  // functions are included as text, so swapping in a different custom compiler counts as a change too
  let fingerprint
  try {
    fingerprint = crypto.createHash('sha1').update(JSON.stringify({
      roosevelt: require('../../package.json').version,
      appVersion: app.get('appVersion'),
      params
    }, (key, value) => {
      if (typeof value === 'function') return `[function]${value.toString()}`
      if (value instanceof RegExp) return `[regexp]${value.toString()}`
      return value
    })).digest('hex')
  } catch {
    // params that cannot be converted to text leave no way to tell when the config changed, so the cache is switched off rather than risk serving a stale file
    fingerprint = null
  }

  // only use the cache when the feature is on, roosevelt is writing files at all, and the fingerprint worked
  const enabled = !!params.incrementalBuilds && !!params.makeBuildArtifacts && fingerprint !== null

  if (enabled) {
    try {
      const loaded = fs.readJsonSync(cacheFile)

      // a cache left over from a different config means everything gets built this run
      //
      // its entries are kept, marked stale so that none of them counts as fresh, because they are also the only record of which files roosevelt wrote, which is what lets an output whose source has since been deleted be removed rather than left behind
      if (loaded && loaded.fingerprint === fingerprint) cache = loaded
      else if (loaded && loaded.artifacts && typeof loaded.artifacts === 'object') {
        for (const entry of Object.values(loaded.artifacts)) if (entry) entry.stale = true
        cache.artifacts = loaded.artifacts
        dirty = true
      }
    } catch {
      // a missing or unreadable cache also just means everything gets built this run
    }
    cache.fingerprint = fingerprint
  }

  // the cache entry a key is stored under
  //
  // most keys name the file being built, and are resolved so the same file is always found under the same key. a key such as js:bundle:0 names something that is not a file, and resolving it would make it depend on the directory the process happened to be started from. a windows drive letter is a single character, so it is never mistaken for one
  function keyOf (key) {
    return /^[a-z][a-z0-9-]+:/i.test(key) ? key : path.resolve(key)
  }

  // a file that cannot be read counts as changed
  function hashFile (file) {
    try {
      return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex')
    } catch {
      return null
    }
  }

  // compilers report the files they read in different shapes: sass gives urls, less and stylus give paths, webpack mixes in directories
  //
  // this reduces them all to a sorted list of real files
  function normalizeSources (sources) {
    const normalized = new Set()
    for (const source of [].concat(sources || [])) {
      if (!source) continue
      let file = source
      if (file instanceof URL || (typeof file === 'string' && file.startsWith('file://'))) {
        try {
          file = url.fileURLToPath(file)
        } catch {
          continue
        }
      }
      if (typeof file !== 'string') continue
      try {
        if (fs.statSync(file).isFile()) normalized.add(path.resolve(file))
      } catch {
        // anything that is not a readable file is left out; if it was recorded last time, its hash will not match and the file gets rebuilt
      }
    }
    return [...normalized].sort()
  }

  // true when a static file does not need to be built again
  function isFresh (key, expectedSources) {
    if (!enabled) return false

    // build it if this is the first time, or if the last run left nothing usable behind
    const entry = cache.artifacts[keyOf(key)]
    if (!entry || entry.stale || !entry.sources || !entry.outputs) return false
    if (!Object.keys(entry.outputs).length || !Object.keys(entry.sources).length) return false

    // generators that know their full file list up front pass it in, so that adding a file to a bundle or removing one from it counts as a change
    if (expectedSources !== undefined) {
      const expected = normalizeSources(expectedSources)
      const recorded = Object.keys(entry.sources).sort()
      if (expected.length !== recorded.length) return false
      for (let i = 0; i < expected.length; i++) {
        if (expected[i] !== recorded[i]) return false
      }
    }

    // build it again if the last one was deleted, truncated, or edited by hand
    for (const output of Object.keys(entry.outputs)) {
      if (entry.outputs[output] !== hashFile(output)) return false
    }

    // build it again if any of the files it was built from were edited
    for (const source of Object.keys(entry.sources)) {
      if (entry.sources[source] !== hashFile(source)) return false
    }

    return true
  }

  // remember what a static file was built from so the next run can skip it
  //
  // outputs defaults to the key itself, which covers generators that write a single file
  //
  // group names the kind of file, such as css, so that prune() can find every entry of that kind
  function record (key, { outputs, sources, group } = {}) {
    if (!enabled) return
    const normalizedSources = normalizeSources(sources)
    const normalizedOutputs = normalizeSources(outputs || key)

    // with nothing to compare against this would always look unchanged, so refuse to remember it and let it build every time
    if (!normalizedSources.length || !normalizedOutputs.length) return forget(key)

    const sourceHashes = {}
    for (const source of normalizedSources) sourceHashes[source] = hashFile(source)
    const outputHashes = {}
    for (const output of normalizedOutputs) outputHashes[output] = hashFile(output)
    cache.artifacts[keyOf(key)] = { outputs: outputHashes, sources: sourceHashes, ...(group ? { group } : {}) }
    dirty = true
  }

  // build this again next run, used when a build fails and its output can no longer be trusted
  //
  // the entry is marked stale rather than dropped, since the outputs it lists are still the files roosevelt wrote, and prune() and removeOutputs() need to know that to clean them up later
  function forget (key) {
    if (!enabled) return
    const entry = cache.artifacts[keyOf(key)]
    if (entry && !entry.stale) {
      entry.stale = true
      dirty = true
    }
  }

  // deletes outputs of an entry that the build no longer produces, such as the page of a source file that was deleted
  //
  // only a file roosevelt wrote itself is ever deleted: it has to be one the cache recorded, still exactly as roosevelt left it, and not something another entry still produces. a file edited by hand, or one that another source now writes to the same place, is left alone
  //
  // keep lists the outputs that are still produced; everything else the entry recorded is removed from it. within is the folder the outputs are written into, inside which any folder left empty is removed too
  function removeOutputs (key, keep = [], within) {
    if (!enabled) return []
    const entry = cache.artifacts[keyOf(key)]

    // an entry with no group was recorded by an older version of roosevelt, which did not always record only the files it wrote, so it is not trusted to say what can be deleted
    if (!entry || !entry.outputs || !entry.group) return []
    const kept = new Set([].concat(keep).map(file => path.resolve(file)))
    const removed = []
    for (const output of Object.keys(entry.outputs)) {
      if (kept.has(output)) continue
      if (removeOutput(output, entry.outputs[output], keyOf(key), within)) removed.push(output)
      delete entry.outputs[output]
      dirty = true
    }
    return removed
  }

  // deletes the outputs of every entry of a group that the build no longer produces, such as the css of a stylesheet that was deleted, and forgets the entry
  //
  // live lists the keys of the group that the build still produces, whether or not they were rebuilt this time
  function prune (group, live = [], within) {
    if (!enabled) return []
    const liveKeys = new Set([].concat(live).map(keyOf))
    const removed = []
    for (const key of Object.keys(cache.artifacts)) {
      const entry = cache.artifacts[key]
      if (!entry || entry.group !== group || liveKeys.has(key)) continue
      for (const output of Object.keys(entry.outputs || {})) {
        if (removeOutput(output, entry.outputs[output], key, within)) removed.push(output)
      }
      delete cache.artifacts[key]
      dirty = true
    }
    return removed
  }

  function removeOutput (output, recordedHash, ownKey, within) {
    // another entry still produces this file, so it is not this entry's to delete
    for (const [key, entry] of Object.entries(cache.artifacts)) {
      if (key !== ownKey && entry?.outputs && Object.hasOwn(entry.outputs, output)) return false
    }

    // a file that is gone needs no deleting, and one that no longer matches what roosevelt wrote has been changed by something else since, so it is not roosevelt's to delete anymore
    if (!recordedHash || hashFile(output) !== recordedHash) return false
    try {
      fs.rmSync(output, { force: true })
    } catch {
      return false
    }
    app.get('logger').info('🗑️', `${app.get('appName')} removing ${output}, which is no longer built from anything`.yellow)

    // a folder that only held outputs that are gone now would otherwise be left behind empty, such as the folder of a page written with the folderPerPage param
    if (within) {
      const boundary = path.resolve(within)
      let dir = path.dirname(output)
      while (dir.startsWith(boundary + path.sep)) {
        try {
          if (fs.readdirSync(dir).length) break
          fs.rmdirSync(dir)
        } catch {
          break
        }
        dir = path.dirname(dir)
      }
    }
    return true
  }

  function save () {
    if (!enabled || !dirty) return
    try {
      fs.outputJsonSync(cacheFile, cache)
      dirty = false
    } catch {
      // failing to save only costs a rebuild next run, so it is not worth interrupting startup over
      app.get('logger').warn(`${app.get('appName')} failed to write the incremental build cache to ${cacheFile}. The next build will regenerate all static files.`)
    }
  }

  return { enabled, isFresh, record, forget, removeOutputs, prune, save }
}
