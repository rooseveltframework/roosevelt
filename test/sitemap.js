const { describe, it, beforeEach, afterEach } = require('node:test')

const assert = require('assert')
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const captureLogs = require('./util/captureLogs')

describe('sitemap', () => {
  const appDir = path.join(__dirname, 'app/sitemap')
  const pagesDir = path.join(appDir, 'statics/pages')
  const publicDir = path.join(appDir, 'public')
  const port = 30340
  const context = {}

  function writePage (name, contents = '<p>a page</p>') {
    const file = path.join(pagesDir, name)
    fs.ensureDirSync(path.dirname(file))
    fs.writeFileSync(file, contents)
  }

  function config (options = {}) {
    return {
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      viewEngine: 'html: teddy',
      https: { enable: false },
      http: { port },
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      ...options,
      sitemap: { enable: true, ...options.sitemap }
    }
  }

  async function start (options) {
    const app = roosevelt(config(options))
    await app.startServer()
    context.app = app
    return app.expressApp
  }

  // a request on a connection of its own that closes when it is answered. fetch keeps its connections open for the next request, and roosevelt waits for open connections to close before it stops, so every test would wait out the shutdown timeout
  function get (route) {
    return new Promise((resolve, reject) => {
      http.get({ host: 'localhost', port, path: route, agent: false }, response => {
        let body = ''
        response.on('data', chunk => { body += chunk })
        response.on('end', () => resolve({ status: response.statusCode, type: response.headers['content-type'], body }))
      }).on('error', reject)
    })
  }

  function locs (xml) {
    return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1])
  }

  beforeEach(() => {
    delete process.env.NODE_ENV // roosevelt writes this, and it outranks the mode param on the next app built in this process
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(pagesDir)
  })

  afterEach(async () => {
    if (context.app) await context.app.stopServer({ persistProcess: true }) // which stops the statics watcher too, which would otherwise keep the test process running
    context.app = null
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('is off unless enabled', async () => {
    await start({ sitemap: { enable: false } })
    assert.strictEqual((await get('/sitemap.xml')).status, 404)
    assert.strictEqual((await get('/robots.txt')).status, 404)
  })

  it('lists the static pages, with each folder\'s index page at the folder, and none the generator does not build', async () => {
    writePage('index.html')
    writePage('about.html')
    writePage('blog/index.html')
    writePage('blog/first-post.html')
    writePage('draft.html', '<!-- roosevelt-blocklist -->\n<p>not ready</p>')
    writePage('blocked.html')
    writePage('about.js', 'module.exports = () => ({})') // a page's model rather than a page
    await start({ html: { blocklist: ['blocked.html'] } })

    const sitemap = await get('/sitemap.xml')
    assert.strictEqual(sitemap.status, 200)
    assert.match(sitemap.type, /application\/xml/)
    assert.ok(sitemap.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
    assert.deepStrictEqual(locs(sitemap.body).sort(), [
      `http://localhost:${port}/`,
      `http://localhost:${port}/about.html`,
      `http://localhost:${port}/blog/`,
      `http://localhost:${port}/blog/first-post.html`
    ])
  })

  it('lists the static pages where folderPerPage writes them', async () => {
    writePage('index.html')
    writePage('about.html')
    await start({ html: { folderPerPage: 'index.html' } })
    assert.deepStrictEqual(locs((await get('/sitemap.xml')).body).sort(), [`http://localhost:${port}/`, `http://localhost:${port}/about/`])
  })

  it('uses baseUrl rather than the address it was asked at, when it is set', async () => {
    writePage('about.html')
    await start({ sitemap: { baseUrl: 'https://example.com/' } })
    assert.deepStrictEqual(locs((await get('/sitemap.xml')).body), ['https://example.com/about.html'])
  })

  it('adds the urls from the urls param and from app.get(\'sitemap\').add(), once each, less the ones excluded', async () => {
    writePage('about.html')
    await start({
      sitemap: {
        baseUrl: 'https://example.com',
        exclude: ['/secret/*'],
        urls: async (app, req) => [
          '/reviews/1',
          { loc: '/reviews/2', lastmod: new Date('2024-08-01T12:00:00Z'), changefreq: 'monthly', priority: 0.8 },
          'https://elsewhere.example/page',
          '/secret/page',
          '/about.html', // the static page already listed
          { loc: '' }, // nothing to list
          null
        ]
      },
      onServerInit: app => {
        app.get('sitemap').add(() => ['/from-a-controller?a=1&b=2', '/reviews/1'])
      }
    })

    const xml = (await get('/sitemap.xml')).body
    assert.deepStrictEqual(locs(xml), [
      'https://example.com/about.html',
      'https://example.com/reviews/1',
      'https://example.com/reviews/2',
      'https://elsewhere.example/page',
      'https://example.com/from-a-controller?a=1&amp;b=2'
    ])
    assert.ok(xml.includes('<loc>https://example.com/reviews/2</loc>\n    <lastmod>2024-08-01T12:00:00.000Z</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>'))
  })

  const routesFile = path.join(appDir, 'sitemap-routes.json')
  const readRoutesFile = () => JSON.parse(fs.readFileSync(routesFile, 'utf8'))
  const writeRoutesFile = verdicts => fs.outputFileSync(routesFile, JSON.stringify(verdicts, null, 2) + '\n')

  // development mode, which is where the routes file is kept up to date, without the parts of it these tests do not need
  const development = { mode: 'development', frontendReload: { enable: false }, logging: { methods: { http: false, info: false, verbose: false } } }

  it('finds the routes that could serve a page, from the router and from the app itself, and adds them to the routes file for review in development mode, without listing them yet', async () => {
    captureLogs.start()
    await start({
      ...development,
      onBeforeControllers: app => {
        const router = app.get('router')
        router.route('/').get((req, res) => res.send('home'))
        router.route('/about').get((req, res) => res.send('about'))
        router.route('/contact.html').get((req, res) => res.send('contact'))
        router.route('/profile/:username').get((req, res) => res.send('a profile')) // varies, so it is the app's to list
        router.route('/files/*path').get((req, res) => res.send('a file')) // a wildcard
        router.route('/feed.xml').get((req, res) => res.send('<rss/>')) // a file rather than a page
        router.route('/subscribe').post((req, res) => res.send('subscribed')) // nothing to get
        router.route('/everything').all((req, res) => res.send('answers every method, get included'))
        app.get(['/listed-by-the-app', '/and-its-other-path'], (req, res) => res.send('a route on the app rather than the router'))
      }
    })
    const output = captureLogs.stop()
    assert.deepStrictEqual(readRoutesFile(), {
      '/': null,
      '/about': null,
      '/and-its-other-path': null,
      '/contact.html': null,
      '/everything': null,
      '/listed-by-the-app': null
    })
    assert.deepStrictEqual(locs((await get('/sitemap.xml')).body), []) // nothing is listed until someone says so
    assert.ok(output.includes('6 routes waiting for you to decide') && output.includes('/listed-by-the-app'), output)
  })

  it('lists only the routes the routes file marks true, by their own entry or by a pattern', async () => {
    writeRoutesFile({
      '/': true,
      '/about': false,
      '/contact': null,
      '/admin/*': false,
      '/admin/public': true, // its own entry decides over the pattern
      '/docs/*': true,
      '/docs/*/draft': false // a pattern leaving it out decides over one listing it
    })
    captureLogs.start()
    await start({
      logging: { methods: { http: false, info: false, verbose: false } },
      sitemap: { baseUrl: 'https://example.com' },
      onBeforeControllers: app => {
        for (const route of ['/', '/about', '/contact', '/not-in-the-file', '/admin/users', '/admin/public', '/docs/guide', '/docs/guide/draft']) {
          app.get('router').route(route).get((req, res) => res.send(route))
        }
      }
    })
    const output = captureLogs.stop()
    assert.deepStrictEqual(locs((await get('/sitemap.xml')).body), ['https://example.com/', 'https://example.com/admin/public', 'https://example.com/docs/guide'])
    assert.ok(output.includes('leaving 2 routes out of the sitemap') && output.includes('/contact, /not-in-the-file'), output) // waiting for review, which production mode says rather than doing
  })

  it('in development mode, keeps the routes file\'s verdicts and patterns, adds new routes as null, and removes the entries for routes that are gone', async () => {
    writeRoutesFile({ '/': true, '/gone': false, '/admin/*': false })
    captureLogs.start()
    await start({
      ...development,
      onBeforeControllers: app => {
        for (const route of ['/', '/new', '/admin/users']) app.get('router').route(route).get((req, res) => res.send(route))
      }
    })
    const output = captureLogs.stop()
    assert.deepStrictEqual(readRoutesFile(), { '/': true, '/admin/*': false, '/new': null })
    assert.ok(output.includes('1 route waiting for you to decide whether the sitemap lists it: /new'), output)
  })

  it('leaves the routes file alone outside development mode, and lists none of the routes without one', async () => {
    await start({ onBeforeControllers: app => app.get('router').route('/about').get((req, res) => res.send('about')) })
    assert.strictEqual(fs.existsSync(routesFile), false)
    assert.deepStrictEqual(locs((await get('/sitemap.xml')).body), [])
  })

  it('lists the router\'s routes under the route prefix, by their paths with the prefix', async () => {
    writeRoutesFile({ '/site/about': true })
    await start({ routePrefix: '/site', sitemap: { baseUrl: 'https://example.com' }, onBeforeControllers: app => app.get('router').route('/about').get((req, res) => res.send('about')) })
    assert.deepStrictEqual(locs((await get('/site/sitemap.xml')).body), ['https://example.com/site/about'])
  })

  it('serves the robots.txt file the robotsTxt param names, with the line pointing to the sitemap added once', async () => {
    fs.outputFileSync(path.join(appDir, 'mvc/views/robots.txt'), 'User-agent: *\nDisallow: /harming/humans\n')
    await start({ sitemap: { baseUrl: 'https://example.com', robotsTxt: 'mvc/views/robots.txt' } })
    assert.strictEqual((await get('/robots.txt')).body, 'User-agent: *\nDisallow: /harming/humans\n\nSitemap: https://example.com/sitemap.xml\n')

    fs.outputFileSync(path.join(appDir, 'mvc/views/robots.txt'), 'User-agent: *\nSitemap: https://example.com/sitemap.xml\n')
    assert.strictEqual((await get('/robots.txt')).body, 'User-agent: *\nSitemap: https://example.com/sitemap.xml\n') // read again for each request, and already pointing to the sitemap
  })

  it('serves a robots.txt that points to the sitemap when the app has none, and gives an app with its own the line to add', async () => {
    const app = await start({ sitemap: { baseUrl: 'https://example.com' } })
    const robots = await get('/robots.txt')
    assert.strictEqual(robots.body, 'User-agent: *\nDisallow:\n\nSitemap: https://example.com/sitemap.xml\n')
    assert.strictEqual(app.get('sitemap').robotsLine(), 'Sitemap: https://example.com/sitemap.xml')
  })

  it('serves the app\'s own routes at either path instead of its own', async () => {
    await start({
      onBeforeControllers: app => {
        app.get('router').get('/robots.txt', (req, res) => res.type('text/plain').send('the app\'s own'))
        app.get('router').get('/sitemap.xml', (req, res) => res.send('the app\'s own sitemap'))
      }
    })
    assert.strictEqual((await get('/robots.txt')).body, 'the app\'s own')
    assert.strictEqual((await get('/sitemap.xml')).body, 'the app\'s own sitemap')
  })

  it('serves the app\'s own robots.txt file instead of its own', async () => {
    fs.outputFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *\nDisallow: /private\n')
    await start()
    assert.strictEqual((await get('/robots.txt')).body, 'User-agent: *\nDisallow: /private\n')
  })

  it('serves under the route prefix, and lists the static pages under it', async () => {
    writePage('about.html')
    await start({ routePrefix: '/site', sitemap: { baseUrl: 'https://example.com' } })
    const xml = (await get('/site/sitemap.xml')).body
    assert.deepStrictEqual(locs(xml), ['https://example.com/site/about.html'])
    assert.ok((await get('/site/robots.txt')).body.includes('Sitemap: https://example.com/site/sitemap.xml'))
  })

  it('splits more urls than one file may hold into files listed by an index', async () => {
    await start({ sitemap: { baseUrl: 'https://example.com', urls: () => Array.from({ length: 50001 }, (_, i) => `/page/${i}`) } })
    const index = (await get('/sitemap.xml')).body
    assert.ok(index.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
    assert.deepStrictEqual(locs(index), ['https://example.com/sitemap-1.xml', 'https://example.com/sitemap-2.xml'])
    assert.strictEqual(locs((await get('/sitemap-1.xml')).body).length, 50000)
    assert.deepStrictEqual(locs((await get('/sitemap-2.xml')).body), ['https://example.com/page/50000'])
    assert.strictEqual((await get('/sitemap-3.xml')).status, 404)
  })

  it('keeps what it made for cacheSeconds, and makes it again after refresh()', async () => {
    let calls = 0
    const app = await start({ sitemap: { cacheSeconds: 3600, urls: () => [`/call/${++calls}`] } })
    assert.ok((await get('/sitemap.xml')).body.includes('/call/1'))
    assert.ok((await get('/sitemap.xml')).body.includes('/call/1'))
    app.get('sitemap').refresh()
    assert.ok((await get('/sitemap.xml')).body.includes('/call/2'))
  })

  it('makes it again on every request in development mode, unless told otherwise', async () => {
    let calls = 0
    await start({ mode: 'development', frontendReload: { enable: false }, sitemap: { urls: () => [`/call/${++calls}`] } })
    await get('/sitemap.xml')
    assert.ok((await get('/sitemap.xml')).body.includes('/call/2'))
  })

  describe('as files, for a site whose web server serves them', () => {
    it('writes the sitemap and a robots.txt into the public folder when the site is built', async () => {
      writePage('index.html')
      writePage('about.html')
      await roosevelt(config({ sitemap: { file: true, baseUrl: 'https://example.com' } })).initServer()
      assert.deepStrictEqual(locs(fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8')), ['https://example.com/', 'https://example.com/about.html'])
      assert.strictEqual(fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow:\n\nSitemap: https://example.com/sitemap.xml\n')
    })

    it('leaves a robots.txt of the app\'s own alone, and says what to add to it', async () => {
      fs.outputFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *\nDisallow: /private\n')
      captureLogs.start()
      await roosevelt(config({ logging: { methods: { http: false, info: false, verbose: false } }, sitemap: { file: true, baseUrl: 'https://example.com' } })).initServer()
      const output = captureLogs.stop()
      assert.strictEqual(fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /private\n')
      assert.ok(output.includes('Sitemap: https://example.com/sitemap.xml'), output)
    })

    it('writes nothing, and says why, without a baseUrl', async () => {
      writePage('about.html')
      captureLogs.start()
      await roosevelt(config({ logging: { methods: { http: false, info: false, verbose: false } }, sitemap: { file: true } })).initServer()
      const output = captureLogs.stop()
      assert.strictEqual(fs.existsSync(path.join(publicDir, 'sitemap.xml')), false)
      assert.ok(output.includes('sitemap.baseUrl'), output)
    })

    it('includes urls from the app, which can come from anything onServerInit set up', async () => {
      await roosevelt(config({
        sitemap: { file: true, baseUrl: 'https://example.com' },
        onServerInit: app => {
          const database = ['/from/the/database']
          app.get('sitemap').add(() => database)
        }
      })).initServer()
      assert.deepStrictEqual(locs(fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8')), ['https://example.com/from/the/database'])
    })
  })
})
