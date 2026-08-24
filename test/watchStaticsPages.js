const { describe, it, after, afterEach, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const { pagesAffectedBy } = require('../lib/watchStatics')

// which pages a rebuild renders again
//
// roosevelt cannot ask a view engine which templates a page included, so it works out what to render from what the edited
// file is: a page renders itself, a template that is not a page renders all of them, and a file no page is built from
// renders none
describe('narrowing a statics rebuild to the pages that changed', () => {
  const appDir = path.join(__dirname, 'app/watchStaticsPages')
  const startedApps = []

  // every page prints a value from the global model, and the model is set from this on each build
  // it lives in memory, so changing it is invisible to the watcher: a page showing the new value was rendered again, and
  // one still showing the old value was left alone
  let stamp

  // counts the rebuilds the watcher performed, so a test can tell "no page was rendered" apart from "no rebuild happened"
  let rebuilds

  // the files each rebuild was told about, which is what roosevelt decides from
  // a failure quotes this, because "the watcher never reported the edit" and "the edit was reported but attributed to the
  // wrong page" both look like a page that did not get rendered
  let reported

  // every build that started, counted before anything in it can fail
  // this separates a rebuild that never began from one that began and then threw, which reported cannot tell apart
  let builds

  // a watcher of the test's own, on the same directory through the same api roosevelt uses
  // this says whether the platform reported an edit at all, which is not something roosevelt's own behavior can show
  let probed
  let probe

  const settle = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

  async function eventually (condition, timeout = 8000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await condition()) return true
      await settle(100)
    }
    return false
  }

  // macos delivers fs.watch events through fsevents, and a stream does not start reporting the moment fs.watch returns
  // a write that lands in that gap is dropped rather than delivered late, so an edit made right after the watcher starts
  // can go unseen forever; linux does not have this window, which is why this only ever bites on macos
  //
  // so the edit is repeated until the watcher acts on it, which is the same "wait for the condition" approach the rest of
  // this file takes rather than a sleep long enough to hope the stream is live by then
  async function editUntilNoticed (file, contents, noticed, timeout = 20000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      fs.outputFileSync(file, contents)
      if (await eventually(noticed, 2000)) return true
    }
    return false
  }

  function writeSite () {
    fs.outputFileSync(path.join(appDir, 'statics/pages/a.html'), '<p>a</p><p>{stamp}</p>')
    fs.outputFileSync(path.join(appDir, 'statics/pages/b.html'), '<p>b</p><p>{stamp}</p>')
    // the first line marker is how an app says a template is a layout or a partial rather than a page of its own
    fs.outputFileSync(path.join(appDir, 'statics/pages/shared.html'), '<!--! roosevelt-blocklist -->\n<p>shared</p>')
    fs.outputFileSync(path.join(appDir, 'statics/css/main.css'), 'p { color: red; }')
  }

  // what the watcher reported to each rebuild, relative to the app directory so a failure is readable
  function saw () {
    const rebuildsSeen = reported.length
      ? 'rebuilds saw: ' + reported.map(files => `[${files.map(file => path.relative(appDir, file)).join(', ')}]`).join(' then ')
      : 'no rebuild finished'
    return `${rebuildsSeen}; builds started: ${builds} (1 means only the first one); the test's own watcher saw: [${probed.join(', ') || 'nothing'}]`
  }

  function built (page) {
    return fs.readFileSync(path.join(appDir, 'public', page), 'utf8')
  }

  async function startWithStamp (initial) {
    stamp = initial
    rebuilds = 0
    reported = []
    builds = 0
    probed = []
    const app = roosevelt({
      appDir,
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      frontendReload: { enable: false },
      viewEngine: 'html: teddy',
      http: { enable: false },
      https: { enable: false },
      mode: 'development',
      // this fires before every build, the first one and each rebuild, so the pages pick up the current value
      onBeforeStatics: app => {
        builds++
        app.get('htmlModels')['*'] = { stamp }
      },
      onStaticsRebuilt: (app, files) => {
        rebuilds++
        reported.push(files)
      }
    })
    await app.initServer()
    startedApps.push(app)
    require('../lib/watchStatics')(app.expressApp)
    probe = fs.watch(path.join(appDir, 'statics'), { recursive: true }, (event, file) => {
      if (file) probed.push(`${event}:${file}`)
    })
    return app
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  afterEach(async () => {
    // the watchers hold the app dir open, so they have to go before the next test wipes it
    if (probe) {
      probe.close()
      probe = null
    }
    for (const app of startedApps) {
      for (const watcher of app.expressApp.get('staticsWatchers') || []) watcher.close()
      app.expressApp.set('staticsWatchers', null)
    }
    startedApps.length = 0
    await settle(100)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should render only the page whose source changed', async () => {
    writeSite()
    await startWithStamp('first')
    assert.ok(built('a.html').includes('first'), `expected the first build to use the model, got: ${built('a.html')}`)
    assert.ok(built('b.html').includes('first'))

    stamp = 'second'
    const rebuilt = await editUntilNoticed(path.join(appDir, 'statics/pages/a.html'), '<p>a edited</p><p>{stamp}</p>', () => built('a.html').includes('second'))
    assert.ok(rebuilt, `expected the edited page to be rendered again, got: ${built('a.html')}; ${saw()}`)
    assert.ok(built('b.html').includes('first'), `expected the other page to be left as it was, got: ${built('b.html')}; ${saw()}`)
  })

  it('should render every page when a template they share changes', async () => {
    writeSite()
    await startWithStamp('first')

    stamp = 'second'
    // roosevelt has no way of knowing which pages include this, so all of them have to be rendered again
    const rebuilt = await editUntilNoticed(path.join(appDir, 'statics/pages/shared.html'), '<!--! roosevelt-blocklist -->\n<p>shared, edited</p>', () => built('a.html').includes('second') && built('b.html').includes('second'))
    assert.ok(rebuilt, `expected both pages to be rendered again, got: ${built('a.html')} and ${built('b.html')}; ${saw()}`)
  })

  it('should render no pages when the change was to something no page is built from', async () => {
    writeSite()
    await startWithStamp('first')

    stamp = 'second'
    // the rebuild still runs, which is what makes this worth asserting: the pages are skipped, not the rebuild
    const rebuilt = await editUntilNoticed(path.join(appDir, 'statics/css/main.css'), 'p { color: blue; }', () => rebuilds > 0)
    assert.ok(rebuilt, `expected the edit to trigger a rebuild; ${saw()}`)
    assert.ok(built('a.html').includes('first'), `expected the pages to be left as they were, got: ${built('a.html')}; ${saw()}`)
    assert.ok(built('b.html').includes('first'))
  })

  it('should render the page a changed model belongs to', async () => {
    writeSite()
    fs.outputFileSync(path.join(appDir, 'statics/pages/a.js'), "module.exports = () => ({ label: 'one' })\n")
    await startWithStamp('first')

    stamp = 'second'
    const rebuilt = await editUntilNoticed(path.join(appDir, 'statics/pages/a.js'), "module.exports = () => ({ label: 'two' })\n", () => built('a.html').includes('second'))
    assert.ok(rebuilt, `expected the model's page to be rendered again, got: ${built('a.html')}; ${saw()}`)
    assert.ok(built('b.html').includes('first'), `expected the other page to be left as it was, got: ${built('b.html')}; ${saw()}`)
  })

  it('should render every page when a model that belongs to no one page changes', async () => {
    writeSite()
    fs.outputFileSync(path.join(appDir, 'statics/pages/models/shared.js'), "module.exports = () => ({ label: 'one' })\n")
    await startWithStamp('first')

    stamp = 'second'
    // nothing says which pages read this, so it is treated as something all of them might
    const rebuilt = await editUntilNoticed(path.join(appDir, 'statics/pages/models/shared.js'), "module.exports = () => ({ label: 'two' })\n", () => built('a.html').includes('second') && built('b.html').includes('second'))
    assert.ok(rebuilt, `expected both pages to be rendered again, got: ${built('a.html')} and ${built('b.html')}; ${saw()}`)
  })

  // the decision on its own, without the watcher in the way
  // these separate "roosevelt attributed the edit to the wrong page" from "the platform never reported the edit at all",
  // which look identical from the outside: either way the page does not get rendered
  async function appForDecisions () {
    writeSite()
    fs.outputFileSync(path.join(appDir, 'statics/pages/a.js'), "module.exports = () => ({ label: 'one' })\n")
    const app = roosevelt({
      appDir,
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      frontendReload: { enable: false },
      viewEngine: 'html: teddy',
      http: { enable: false },
      https: { enable: false },
      mode: 'development'
    })
    await app.initServer()
    startedApps.push(app)
    return app.expressApp
  }

  const statics = () => [path.join(appDir, 'statics')]
  const inStatics = file => path.join(appDir, 'statics', file)

  it('should attribute an edited page to itself', async () => {
    const app = await appForDecisions()

    assert.deepStrictEqual(pagesAffectedBy(app, [inStatics('pages/a.html')], statics()), ['a.html'])
  })

  it('should attribute an edited model to the page beside it', async () => {
    const app = await appForDecisions()

    assert.deepStrictEqual(pagesAffectedBy(app, [inStatics('pages/a.js')], statics()), ['a.html'])
  })

  it('should attribute an edited template that is not a page to every page', async () => {
    const app = await appForDecisions()

    assert.strictEqual(pagesAffectedBy(app, [inStatics('pages/shared.html')], statics()), undefined)
  })

  it('should attribute an edited stylesheet to no page', async () => {
    const app = await appForDecisions()

    assert.deepStrictEqual(pagesAffectedBy(app, [inStatics('css/main.css')], statics()), [])
  })

  it('should render every page for a path it cannot place under anything it watches', async () => {
    const app = await appForDecisions()

    assert.strictEqual(pagesAffectedBy(app, [path.join(appDir, 'somewhere/else.html')], statics()), undefined)
  })
})
