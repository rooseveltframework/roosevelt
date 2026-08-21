// internal roosevelt build cache module
// remembers which files each static file was built from, so the ones that did not change can be skipped on the next run
// file contents are compared rather than timestamps, so copying or checking out a file does not cause a needless rebuild, and a file edited without its timestamp changing is still caught

const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const url = require('url')

module.exports = app => {
  const params = app.get('params')
  const cacheFile = path.join(params.buildFolder, 'buildCache.json')
  let cache = { fingerprint: null, artifacts: {} }
  let dirty = false

  // everything apart from the source files that can change what gets built, so that editing config or upgrading roosevelt rebuilds everything
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

      // a cache left over from a different config is ignored, which just means everything gets built this run
      if (loaded && loaded.fingerprint === fingerprint) cache = loaded
    } catch {
      // a missing or unreadable cache also just means everything gets built this run
    }
    cache.fingerprint = fingerprint
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
    const entry = cache.artifacts[path.resolve(key)]
    if (!entry || !entry.sources || !entry.outputs) return false
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
  // outputs defaults to the key itself, which covers generators that write a single file
  function record (key, { outputs, sources } = {}) {
    if (!enabled) return
    const normalizedSources = normalizeSources(sources)
    const normalizedOutputs = normalizeSources(outputs || key)

    // with nothing to compare against this would always look unchanged, so refuse to remember it and let it build every time
    if (!normalizedSources.length || !normalizedOutputs.length) return forget(key)

    const sourceHashes = {}
    for (const source of normalizedSources) sourceHashes[source] = hashFile(source)
    const outputHashes = {}
    for (const output of normalizedOutputs) outputHashes[output] = hashFile(output)
    cache.artifacts[path.resolve(key)] = { outputs: outputHashes, sources: sourceHashes }
    dirty = true
  }

  // build this again next run, used when a build fails and its output can no longer be trusted
  function forget (key) {
    if (!enabled) return
    if (cache.artifacts[path.resolve(key)]) {
      delete cache.artifacts[path.resolve(key)]
      dirty = true
    }
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

  return { enabled, isFresh, record, forget, save }
}
