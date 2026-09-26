// the sitemap: a list of the site's pages for search engines, served as sitemap.xml, and the robots.txt that points them at it
//
// its urls come from four places, in this order:
//   - the pages roosevelt's static page generator builds, which it finds by itself
//   - the app's own routes that serve a page at a fixed path, such as /about, which it also finds by itself, but lists only once they are marked true in the routes file the app commits, so that nothing is published that nobody has looked at
//   - the `sitemap.urls` param, a function that returns more of them
//   - functions the app adds with `app.get('sitemap').add()`, from a controller or an event, for urls only the app knows, such as the pages behind a route with parameters in it, like /profile/:username
//
// each is either a path or url string, or an object with a `loc` and any of `lastmod`, `changefreq`, and `priority`. a path is made into a url with the `sitemap.baseUrl` param, or, when it is not set, with the address the request for the sitemap was made to
//
// the app stays in charge: a route or a file of its own at the sitemap's path, or at /robots.txt, is served instead of roosevelt's, and `app.get('sitemap')` gives it the parts to build its own from
const fs = require('fs-extra')
const path = require('path')
const wildcardMatch = require('./tools/wildcardMatch')

const maxUrlsPerFile = 50000 // what the sitemap protocol allows in one file

module.exports = app => {
  const params = app.get('params').sitemap
  const sources = []
  const cache = new Map() // generated files by the base url they were made for: { files, made }

  // the address the sitemap is made for: the baseUrl param, or failing that, the request's own, or nothing when there is neither
  function baseUrl (req) {
    if (params.baseUrl) return params.baseUrl.replace(/\/+$/, '')
    if (req) return `${req.protocol}://${req.get('host')}`
    return null
  }

  function absolute (loc, base) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(loc)) return loc
    return base + (loc.startsWith('/') ? loc : `/${loc}`)
  }

  // the paths of the pages the static page generator builds, with the index page of each folder at the folder itself
  async function staticPages () {
    if (!params.staticPages) return []
    const prefix = app.get('routePrefix') || ''
    const pages = await require('./preprocessStaticPages').pages(app)
    return pages.map(page => {
      const relative = path.relative(app.get('publicFolder'), page.output).split(path.sep).join('/')
      const url = relative === 'index.html' ? '' : relative.endsWith('/index.html') ? relative.slice(0, -'index.html'.length) : relative
      return { loc: `${prefix}/${url}` }
    }).sort((a, b) => a.loc.localeCompare(b.loc)) // in one order wherever it is made, rather than the order the filesystem lists them in
  }

  // the paths of the app's routes that could serve a page: ones that answer a get request, at a path with nothing in it that varies, and that is not a file other than a web page, such as /robots.txt
  //
  // a route with parameters or wildcards in its path is left for the app to list with add(), since only the app knows the values that fill them in
  //
  // these are only candidates. which of them the sitemap lists is decided by the routes file, since roosevelt cannot tell a public page from one behind a login. see review()
  function discoveredRoutes () {
    const prefix = app.get('routePrefix') || ''
    const ownPaths = [params.path, '/robots.txt']
    const appRouter = require('./tools/expressVersion')(app.get('appDir')) >= 5 ? app.router : app._router // the routes an app adds with app.get() rather than with the router roosevelt gives its controllers
    const stacks = [[app.get('router')?.stack, prefix], [appRouter?.stack, '']]
    const found = []
    for (const [stack, mountedAt] of stacks) {
      for (const layer of stack || []) {
        const route = layer.route
        if (!route || !(route.methods.get || route.methods._all)) continue
        for (const routePath of [].concat(route.path)) {
          if (typeof routePath !== 'string' || /[:*?+(){}[\]]/.test(routePath)) continue // a pattern rather than one path
          if (ownPaths.includes(routePath)) continue
          const extension = path.posix.extname(routePath)
          if (extension && extension !== '.html') continue
          const listedAt = mountedAt + routePath
          if (!found.includes(listedAt)) found.push(listedAt)
        }
      }
    }
    return found
  }

  // the routes file, which the app commits, says for each route whether the sitemap lists it: true to list it, false to leave it out, and null while it waits for someone to decide. a key can also be a pattern, such as /admin/*, for every route under it, including ones added later
  function routesFile () {
    return path.join(app.get('appDir'), params.routesFile)
  }

  function readVerdicts () {
    try {
      return JSON.parse(fs.readFileSync(routesFile(), 'utf8'))
    } catch (err) {
      if (err.code === 'ENOENT') return {}
      throw new Error(`${app.get('appName')} could not read ${params.routesFile}, which says which routes the sitemap lists: ${err.message}`)
    }
  }

  function isPattern (key) {
    return /[*?[\]{}]/.test(key)
  }

  // true, false, or null for a route the file mentions, whether by its path or by a pattern, and undefined for one it does not. its own entry decides over a pattern, and a pattern leaving it out decides over one listing it
  function verdict (verdicts, routePath) {
    if (Object.hasOwn(verdicts, routePath)) return verdicts[routePath]
    const matching = Object.keys(verdicts).filter(key => isPattern(key) && wildcardMatch(routePath, key)).map(key => verdicts[key])
    if (matching.includes(false)) return false
    if (matching.includes(true)) return true
    if (matching.includes(null)) return null
    return undefined
  }

  // the routes the sitemap lists: the ones the routes file says true for, and none that are waiting for review or that it does not mention, so that a route nobody has looked at is left out rather than published
  function routes () {
    const verdicts = readVerdicts()
    return discoveredRoutes().filter(routePath => verdict(verdicts, routePath) === true).map(loc => ({ loc }))
  }

  // brings the routes file up to date with the app's routes, as the app starts, once they have all been added
  //
  // in development mode, a new route is added to it as null, which shows up in the app's next diff for someone to decide on, and the entry for a route that is gone is removed. patterns are left as they are. it is never written outside development mode, where the app runs whatever was committed
  //
  // a route waiting for review is warned about. it is left out of the sitemap until it is reviewed, so the worst a forgotten one does is go unlisted
  async function review () {
    if (!params.enable) return
    const logger = app.get('logger')
    const appName = app.get('appName')
    const discovered = discoveredRoutes()
    const verdicts = readVerdicts()

    if (app.get('env') === 'development' && app.get('params').makeBuildArtifacts) {
      const reviewed = {}
      const keys = [...Object.keys(verdicts).filter(key => isPattern(key) || discovered.includes(key)), ...discovered.filter(routePath => verdict(verdicts, routePath) === undefined)]
      for (const key of [...new Set(keys)].sort()) reviewed[key] = Object.hasOwn(verdicts, key) ? verdicts[key] : null
      if (JSON.stringify(reviewed) !== JSON.stringify(verdicts)) {
        const fsr = require('./tools/fsr')(app)
        fsr.writeFileSync(routesFile(), JSON.stringify(reviewed, null, 2) + '\n', ['📝', `${appName} updating ${routesFile()} with the routes the sitemap has to be told about`.green])
      }
    }

    const pending = discovered.filter(routePath => { const v = verdict(verdicts, routePath); return v !== true && v !== false })
    if (!pending.length) return
    const list = pending.join(', ')
    if (app.get('env') === 'development') logger.warn(`${appName} has ${pending.length} route${pending.length === 1 ? '' : 's'} waiting for you to decide whether the sitemap lists ${pending.length === 1 ? 'it' : 'them'}: ${list}. Set each one in ${params.routesFile} to true to list it, or to false to leave it out. Until you do, it is left out. The sitemap is public, so list only pages meant for anyone to find.`)
    else logger.warn(`${appName} is leaving ${pending.length} route${pending.length === 1 ? '' : 's'} out of the sitemap because ${params.routesFile} does not say whether to list ${pending.length === 1 ? 'it' : 'them'}: ${list}. Review them in development mode and commit the file.`)
  }

  // every url the sitemap lists, as objects with an absolute loc, in the order their sources gave them, once each and less any the exclude param leaves out
  async function entries (req) {
    const base = baseUrl(req)
    const found = [...await staticPages(), ...routes()]
    for (const source of [params.urls, ...sources].filter(source => typeof source === 'function')) {
      const urls = await source(app, req)
      if (Array.isArray(urls)) found.push(...urls)
    }
    const seen = new Set()
    const listed = []
    for (const entry of found) {
      const normalized = normalize(entry, base)
      if (!normalized || seen.has(normalized.loc)) continue
      if (params.exclude?.length && wildcardMatch(new URL(normalized.loc).pathname, params.exclude)) continue
      seen.add(normalized.loc)
      listed.push(normalized)
    }
    return listed
  }

  function normalize (entry, base) {
    const object = typeof entry === 'string' ? { loc: entry } : entry
    if (!object || typeof object.loc !== 'string' || !object.loc) return null
    const normalized = { loc: absolute(object.loc, base) }
    if (object.lastmod) {
      const date = object.lastmod instanceof Date ? object.lastmod : new Date(object.lastmod)
      if (!isNaN(date)) normalized.lastmod = date.toISOString()
    }
    if (object.changefreq) normalized.changefreq = object.changefreq
    if (object.priority !== undefined) normalized.priority = object.priority
    return normalized
  }

  // the path of each file after the first, when the urls do not fit in one: /sitemap.xml becomes an index of /sitemap-1.xml, /sitemap-2.xml, and so on
  function partPath (n) {
    const { dir, name, ext } = path.posix.parse(params.path)
    return path.posix.join(dir, `${name}-${n}${ext}`)
  }

  // the files the sitemap is made of, by path
  async function files (req) {
    const base = baseUrl(req)
    const cached = cache.get(base)
    const maxAge = params.cacheSeconds ?? (app.get('env') === 'development' ? 0 : 3600)
    if (cached && Date.now() - cached.made < maxAge * 1000) return cached.files

    const listed = await entries(req)
    const made = {}
    if (listed.length <= maxUrlsPerFile) made[params.path] = urlset(listed)
    else {
      const parts = []
      for (let i = 0; i < listed.length; i += maxUrlsPerFile) parts.push(listed.slice(i, i + maxUrlsPerFile))
      parts.forEach((part, i) => { made[partPath(i + 1)] = urlset(part) })
      made[params.path] = sitemapIndex(parts.map((part, i) => absolute(`${app.get('routePrefix') || ''}${partPath(i + 1)}`, base)))
    }
    cache.set(base, { files: made, made: Date.now() })
    return made
  }

  // the robots.txt served when the app has none of its own: the file named by the robotsTxt param, or failing that, one that lets everything be crawled, with the line pointing to the sitemap added to either
  async function robotsTxt (req) {
    let robots = 'User-agent: *\nDisallow:\n'
    if (typeof params.robotsTxt === 'string') robots = await fs.promises.readFile(path.join(app.get('appDir'), params.robotsTxt), 'utf8')
    const line = robotsLine(req)
    return robots.includes(line) ? robots : `${robots.trimEnd()}\n\n${line}\n`
  }

  // the line that points robots.txt at the sitemap, for an app that writes its own robots.txt
  function robotsLine (req) {
    return `Sitemap: ${absolute(`${app.get('routePrefix') || ''}${params.path}`, baseUrl(req))}`
  }

  // the routes that serve the sitemap and robots.txt. they are added after the app's controllers, so a route of the app's own at either path is served instead, and so is a file of the same name in the public folder
  function route (router) {
    if (!params.enable) return
    router.get(params.path, (req, res, next) => serve(req, res, next, params.path))
    router.get(partPath(':n'), (req, res, next) => serve(req, res, next, partPath(req.params.n)))
    if (params.robotsTxt) {
      router.get('/robots.txt', async (req, res, next) => {
        try {
          res.type('text/plain').send(await robotsTxt(req))
        } catch (err) {
          next(err)
        }
      })
    }
  }

  async function serve (req, res, next, file) {
    try {
      const made = await files(req)
      if (!made[file]) return next()
      res.type('application/xml').send(made[file])
    } catch (err) {
      next(err)
    }
  }

  // writes the sitemap, and robots.txt when the app has none, into the public folder, for a site whose web server serves its files without roosevelt
  //
  // this needs the baseUrl param, since there is no request to take an address from
  async function write () {
    if (!params.enable || !params.file || !app.get('params').makeBuildArtifacts) return
    const logger = app.get('logger')
    const appName = app.get('appName')
    if (!params.baseUrl) {
      logger.warn(`${appName} did not write a sitemap file because the \`sitemap.baseUrl\` param is not set, and a sitemap has to list full urls.`)
      return
    }
    const fsr = require('./tools/fsr')(app)
    const publicFolder = app.get('publicFolder')
    for (const [file, xml] of Object.entries(await files())) {
      const target = path.join(publicFolder, file)
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== xml) fsr.writeFileSync(target, xml, ['📝', `${appName} writing new sitemap file ${target}`.green])
    }
    const robots = path.join(publicFolder, 'robots.txt')
    if (params.robotsTxt) {
      if (!fs.existsSync(robots)) fsr.writeFileSync(robots, await robotsTxt(), ['📝', `${appName} writing new robots.txt file ${robots}`.green])
      else if (!fs.readFileSync(robots, 'utf8').includes(robotsLine())) logger.warn(`${appName} left your robots.txt as it is, which does not point to the sitemap. Add this line to it: ${robotsLine()}`)
    }
  }

  return {
    // adds a function that returns more urls, for pages only the app knows about. it is called with the app and, when the sitemap is being served, the request
    add (source) {
      if (typeof source !== 'function') throw new TypeError('A sitemap source has to be a function that returns an array of urls.')
      sources.push(source)
      cache.clear()
    },

    // forgets the sitemap made last, so the next request makes it again, for when the pages it lists have changed
    refresh () {
      cache.clear()
    },

    entries,
    files,
    review,
    robotsLine,
    robotsTxt,
    route,
    write
  }
}

function escape (text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function urlset (entries) {
  const urls = entries.map(entry => {
    let url = `  <url>\n    <loc>${escape(entry.loc)}</loc>\n`
    if (entry.lastmod) url += `    <lastmod>${escape(entry.lastmod)}</lastmod>\n`
    if (entry.changefreq) url += `    <changefreq>${escape(entry.changefreq)}</changefreq>\n`
    if (entry.priority !== undefined) url += `    <priority>${escape(entry.priority)}</priority>\n`
    return url + '  </url>\n'
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('')}</urlset>\n`
}

function sitemapIndex (locs) {
  const sitemaps = locs.map(loc => `  <sitemap>\n    <loc>${escape(loc)}</loc>\n  </sitemap>\n`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.join('')}</sitemapindex>\n`
}
