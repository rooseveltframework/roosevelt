const { describe, it, after, afterEach, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('watching statics', () => {
  const appDir = path.join(__dirname, 'app/watchStatics')
  const startedApps = []

  const appConfig = {
    appDir,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        error: false,
        verbose: false
      }
    },
    makeBuildArtifacts: true,
    csrfProtection: false,
    expressSession: false,
    htmlValidator: { enable: false },
    frontendReload: { enable: false }, // the reload script needs a listening server, which most of these tests do not start
    viewEngine: 'html: teddy',
    http: { enable: false },
    https: { enable: false }
  }

  // the watcher reports a change a moment after the file is written, and rebuilding takes a moment more
  const settle = (ms = 900) => new Promise(resolve => setTimeout(resolve, ms))

  // waits for a condition rather than a fixed delay, so a slow machine does not turn into a failure
  async function eventually (condition, timeout = 8000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await condition()) return true
      await settle(100)
    }
    return false
  }

  function writePage (contents) {
    fs.outputFileSync(path.join(appDir, 'statics/pages/index.html'), contents)
  }

  // macos delivers fs.watch events through fsevents, and a stream does not start reporting the moment fs.watch returns
  // a write that lands in that gap is dropped rather than delivered late, so an edit made right after the watcher starts
  // can go unseen forever; linux does not have this window, which is why this only ever bites on macos
  //
  // so the edit is repeated until the watcher acts on it, which is the same "wait for the condition" approach the rest of
  // this file takes rather than a sleep long enough to hope the stream is live by then
  async function editPageUntilNoticed (contents, noticed, timeout = 20000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      writePage(contents)
      if (await eventually(noticed, 2000)) return true
    }
    return false
  }

  async function start (config) {
    const app = roosevelt({ ...appConfig, ...config })
    await app.initServer()
    startedApps.push(app)
    return app
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  afterEach(async () => {
    // the watchers hold the app dir open, so they have to go before the next test wipes it
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

  it('should rebuild a static page when its source changes', async () => {
    writePage('<p>before</p>')
    const app = await start({ mode: 'development' })
    require('../lib/watchStatics')(app.expressApp)

    const built = path.join(appDir, 'public/index.html')
    assert.ok(fs.readFileSync(built, 'utf8').includes('before'))

    const rebuilt = await editPageUntilNoticed('<p>after</p>', () => fs.readFileSync(built, 'utf8').includes('after'))
    assert.ok(rebuilt, `expected the page to be rebuilt, got: ${fs.readFileSync(built, 'utf8')}`)
  })

  it('should fire onStaticsRebuilt with the files that changed', async () => {
    writePage('<p>before</p>')
    const rebuilds = []
    const app = await start({
      mode: 'development',
      onStaticsRebuilt: (app, files) => rebuilds.push(files)
    })
    require('../lib/watchStatics')(app.expressApp)

    const fired = await editPageUntilNoticed('<p>after</p>', () => rebuilds.length > 0)
    assert.ok(fired, 'expected onStaticsRebuilt to fire')
    assert.ok(rebuilds[0].some(file => file.endsWith('index.html')), `expected the edited file to be reported, got ${JSON.stringify(rebuilds[0])}`)
  })

  it('should not watch in production mode', async () => {
    writePage('<p>before</p>')
    const app = await start({ mode: 'production' })
    require('../lib/watchStatics')(app.expressApp)

    assert.strictEqual(app.expressApp.get('staticsWatchers'), undefined)
  })

  it('should not watch when the feature is disabled', async () => {
    writePage('<p>before</p>')
    const app = await start({ mode: 'development', watchStatics: { enable: false } })
    require('../lib/watchStatics')(app.expressApp)

    assert.strictEqual(app.expressApp.get('staticsWatchers'), undefined)
  })

  it('should not watch when roosevelt is not building static files', async () => {
    writePage('<p>before</p>')
    const app = await start({ mode: 'development', makeBuildArtifacts: false })
    require('../lib/watchStatics')(app.expressApp)

    assert.strictEqual(app.expressApp.get('staticsWatchers'), undefined)
  })

  it('should watch a path the app names on top of its own', async () => {
    writePage('<p>before</p>')
    fs.outputFileSync(path.join(appDir, 'contentSource/data.json'), '{}')
    const app = await start({ mode: 'development', watchStatics: { additionalPaths: ['contentSource'] } })
    require('../lib/watchStatics')(app.expressApp)

    const watched = app.expressApp.get('staticsWatchers')
    assert.ok(watched && watched.length > 1, `expected the extra path to be watched too, got ${watched?.length} watchers`)
  })

  it('should keep serving after a rebuild fails', async () => {
    writePage('<p>before</p>')
    let builds = 0
    const app = await start({ mode: 'development', onBeforeStatics: () => builds++ })
    require('../lib/watchStatics')(app.expressApp)
    const buildsBefore = builds

    // a template the view engine cannot parse, so the rebuild throws rather than writing anything
    // this counts builds rather than the rebuilt page, since a rebuild that failed wrote nothing to look at
    const failed = await editPageUntilNoticed('<if>', () => builds > buildsBefore)
    assert.ok(failed, 'expected the bad save to be picked up and attempted')

    // the watcher has to still be in place, or one bad save would end the dev session
    assert.ok(app.expressApp.get('staticsWatchers').length > 0)

    const recovered = await editPageUntilNoticed('<p>recovered</p>', () => fs.readFileSync(path.join(appDir, 'public/index.html'), 'utf8').includes('recovered'))
    assert.ok(recovered, 'expected a later save to rebuild after a failed one')
  })

  it('should close the browser reload connections after a rebuild, which is what makes the page reload', async () => {
    writePage('<p>before</p>')
    const app = await start({
      mode: 'development',
      frontendReload: { enable: true },
      http: { enable: true, port: 30150 }
    })
    await app.startServer()

    // the reload script in the browser reloads the page when its socket closes and reopens, so closing it is the signal
    const socket = new globalThis.WebSocket('ws://localhost:30150')
    let closed = false
    socket.addEventListener('close', () => { closed = true })
    const opened = await eventually(() => socket.readyState === globalThis.WebSocket.OPEN)
    assert.ok(opened, 'expected the reload connection to be established')
    assert.strictEqual(app.expressApp.get('reloadSockets').size, 1)

    const reloaded = await editPageUntilNoticed('<p>after</p>', () => closed)
    assert.ok(reloaded, 'expected the reload connection to be closed once the rebuild finished')
    assert.strictEqual(app.expressApp.get('reloadSockets').size, 0)

    await app.stopServer({ persistProcess: true })
  })

  it('should close its watchers when the app shuts down', async () => {
    writePage('<p>before</p>')
    const app = await start({ mode: 'development', http: { enable: true, port: 30151 } })
    await app.startServer()
    assert.ok(app.expressApp.get('staticsWatchers').length > 0)

    await app.stopServer({ persistProcess: true })
    assert.strictEqual(app.expressApp.get('staticsWatchers'), null)
  })

  // these drop the ignored file alongside a real edit rather than on its own, so the rebuild that follows proves the
  // watcher was live: a test that only waited to see nothing happen would also pass if no event ever arrived
  it('should not rebuild for a file the app would not commit, such as the .DS_Store macos leaves behind', async () => {
    writePage('<p>before</p>')
    const rebuilds = []
    const app = await start({ mode: 'development', onStaticsRebuilt: (app, files) => rebuilds.push(files) })
    require('../lib/watchStatics')(app.expressApp)

    fs.outputFileSync(path.join(appDir, 'statics/.DS_Store'), 'junk')
    const fired = await editPageUntilNoticed('<p>after</p>', () => rebuilds.length > 0)

    assert.ok(fired, 'expected the page edit to be picked up')
    const seen = rebuilds.flat()
    assert.ok(seen.some(file => file.endsWith('index.html')), `expected the edited page to be reported, got ${JSON.stringify(seen)}`)
    assert.strictEqual(seen.some(file => file.endsWith('.DS_Store')), false, `the .DS_Store should not have been reported, got ${JSON.stringify(seen)}`)
  })

  it('should not rebuild for anything inside a folder the app gitignores', async () => {
    fs.outputFileSync(path.join(appDir, '.gitignore'), 'scratch\n')
    writePage('<p>before</p>')
    const rebuilds = []
    const app = await start({ mode: 'development', onStaticsRebuilt: (app, files) => rebuilds.push(files) })
    require('../lib/watchStatics')(app.expressApp)

    fs.outputFileSync(path.join(appDir, 'statics/scratch/notes.html'), '<p>scratch</p>')
    const fired = await editPageUntilNoticed('<p>after</p>', () => rebuilds.length > 0)

    assert.ok(fired, 'expected the page edit to be picked up')
    const seen = rebuilds.flat()
    assert.strictEqual(seen.some(file => file.includes('scratch')), false, `the gitignored folder should not have been reported, got ${JSON.stringify(seen)}`)
  })
})
