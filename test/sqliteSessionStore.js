const { describe, it, after, beforeEach, afterEach } = require('node:test')

const assert = require('assert')
const path = require('path')
const closeSessionStores = require('./util/closeSessionStores')
const fs = require('fs-extra')
const Sqlite = require('better-sqlite3')
const { Store } = require('express-session')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const SqliteStore = require('../lib/sqliteSessionStore')({ Store })

describe('sqlite session store', () => {
  const appDir = path.join(__dirname, 'app/sqliteSessionStore')

  // windows will not release the folder while an app still holds one of these sqlite files open
  const startedApps = []
  let client
  let store

  // promisified wrappers, since the store speaks the callback based express-session api
  const set = (sid, sess) => new Promise((resolve, reject) => store.set(sid, sess, err => err ? reject(err) : resolve()))
  const get = sid => new Promise((resolve, reject) => store.get(sid, (err, sess) => err ? reject(err) : resolve(sess)))
  const destroy = sid => new Promise((resolve, reject) => store.destroy(sid, err => err ? reject(err) : resolve()))
  const length = () => new Promise((resolve, reject) => store.length((err, count) => err ? reject(err) : resolve(count)))
  const clear = () => new Promise((resolve, reject) => store.clear(err => err ? reject(err) : resolve()))
  const touch = (sid, sess) => new Promise((resolve, reject) => store.touch(sid, sess, err => err ? reject(err) : resolve()))
  const all = () => new Promise((resolve, reject) => store.all((err, sessions) => err ? reject(err) : resolve(sessions)))

  // a session that expires well in the future
  const liveSession = () => ({ cookie: { maxAge: 60000 }, user: 'someone' })

  beforeEach(() => {
    client = new Sqlite(':memory:')
    store = new SqliteStore({ client, expired: { clear: false } })
  })

  afterEach(() => {
    client.close()
  })

  after(() => {
    closeSessionStores(startedApps)
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should refuse to be constructed without a client', () => {
    assert.throws(() => new SqliteStore({}), /A client must be directly provided/)
  })

  it('should store and retrieve a session', async () => {
    await set('abc', liveSession())

    const sess = await get('abc')
    assert.strictEqual(sess.user, 'someone')
  })

  it('should return nothing for a session that was never stored', async () => {
    assert.strictEqual(await get('nope'), null)
  })

  it('should overwrite a session that is set twice', async () => {
    await set('abc', liveSession())
    await set('abc', { cookie: { maxAge: 60000 }, user: 'someone else' })

    assert.strictEqual((await get('abc')).user, 'someone else')
    assert.strictEqual(await length(), 1, 'overwriting should not create a second row')
  })

  it('should destroy a session', async () => {
    await set('abc', liveSession())
    await destroy('abc')

    assert.strictEqual(await get('abc'), null)
  })

  it('should count the stored sessions', async () => {
    await set('a', liveSession())
    await set('b', liveSession())

    assert.strictEqual(await length(), 2)
  })

  it('should clear every session', async () => {
    await set('a', liveSession())
    await set('b', liveSession())
    await clear()

    assert.strictEqual(await length(), 0)
  })

  it('should return every session from all', async () => {
    await set('a', liveSession())
    await set('b', { cookie: { maxAge: 60000 }, user: 'another' })

    // all returns the raw rows, so each session is still a json string in the sess column
    const rows = await all()
    assert.strictEqual(rows.length, 2)
    const users = rows.map(row => JSON.parse(row.sess).user)
    assert.ok(users.includes('someone'))
    assert.ok(users.includes('another'))
  })

  it('should extend the expiry of a session when touched', async () => {
    await set('abc', { cookie: { maxAge: 1000 }, user: 'someone' })
    const before = client.prepare('SELECT expire FROM sessions WHERE sid = ?').get('abc').expire

    await touch('abc', { cookie: { maxAge: 600000 } })
    const after = client.prepare('SELECT expire FROM sessions WHERE sid = ?').get('abc').expire

    assert.ok(after > before, `touch should push the expiry out, got before=${before} after=${after}`)
  })

  it('should not retrieve a session that has expired', async () => {
    // maxAge of zero puts the expiry in the past
    await set('expired', { cookie: { maxAge: -1000 }, user: 'ghost' })

    assert.strictEqual(await get('expired'), null)
  })

  it('should delete expired sessions when clearExpiredSessions runs', async () => {
    await set('expired', { cookie: { maxAge: -1000 }, user: 'ghost' })
    await set('live', liveSession())

    store.clearExpiredSessions()

    assert.strictEqual(await length(), 1)
    assert.strictEqual((await get('live')).user, 'someone')
  })

  it('should start an interval to clear expired sessions when configured to', () => {
    const intervalStore = new SqliteStore({
      client: new Sqlite(':memory:'),
      expired: { clear: true, intervalMs: 60000, unrefInterval: true }
    })

    assert.strictEqual(intervalStore.expired.intervalMs, 60000)
    assert.strictEqual(intervalStore.expired.unrefInterval, true)
  })

  it('should be usable as the session store of a roosevelt app', async () => {
    fs.ensureDirSync(appDir)

    const app = roosevelt({
      appDir,
      makeBuildArtifacts: false,
      csrfProtection: false,
      htmlValidator: { enable: false },
      http: { enable: false },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      expressSession: true,
      expressSessionStore: { filename: path.join(appDir, 'sessions.sqlite') }
    })

    await app.initServer()
    startedApps.push(app.expressApp)

    assert.ok(app.expressApp.get('expressSessionStore'), 'roosevelt should have attached a session store')
  })

  // every method wraps its database work in a try/catch and hands the error to its callback
  // nothing tested those branches, so a store that could not reach its database would have failed silently
  describe('when the database cannot be reached', () => {
    let broken

    beforeEach(() => {
      // the store is built against a working database and then loses it, which is how this fails in practice: the file is removed or the connection is closed while the app is running
      broken = new SqliteStore({ client: new Sqlite(':memory:'), expired: { clear: false } })
      broken.client = { prepare: () => { throw new Error('database is gone') } }
    })

    // a store that swallowed an error would never call back at all, so waiting forever is treated as a failure rather than left to time out the whole run
    const callbackError = method => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the store never called back, so the error was swallowed')), 500)
      method(err => { clearTimeout(timer); resolve(err) })
    })

    it('should hand the error to set', async () => {
      const err = await callbackError(cb => broken.set('sid', liveSession(), cb))

      assert.ok(err instanceof Error, 'the callback should receive the error')
      assert.strictEqual(err.message, 'database is gone')
    })

    it('should hand the error to get', async () => {
      const err = await callbackError(cb => broken.get('sid', cb))

      assert.ok(err instanceof Error)
    })

    it('should hand the error to destroy', async () => {
      assert.ok(await callbackError(cb => broken.destroy('sid', cb)) instanceof Error)
    })

    it('should hand the error to length', async () => {
      assert.ok(await callbackError(cb => broken.length(cb)) instanceof Error)
    })

    it('should hand the error to clear', async () => {
      assert.ok(await callbackError(cb => broken.clear(cb)) instanceof Error)
    })

    it('should hand the error to touch', async () => {
      assert.ok(await callbackError(cb => broken.touch('sid', liveSession(), cb)) instanceof Error)
    })

    it('should hand the error to all', async () => {
      assert.ok(await callbackError(cb => broken.all(cb)) instanceof Error)
    })

    it('should not call the callback a second time with a result after reporting an error', async () => {
      let calls = 0
      await new Promise(resolve => {
        broken.all(() => { calls++; setTimeout(resolve, 20) })
      })

      assert.strictEqual(calls, 1, 'reporting an error should end the call')
    })
  })

  describe('inactivity based expiry', () => {
    // a session whose cookie is valid for years, which is roosevelt's default posture
    const longLivedSession = () => ({ cookie: { maxAge: 347126472000 }, user: 'someone' })

    // reaches into the row to backdate when the session was last used
    const backdate = (sid, msAgo) => client.prepare('UPDATE sessions SET lastAccessed = ? WHERE sid = ?').run(Date.now() - msAgo, sid)

    it('should default maxInactivity to roughly three months', () => {
      const defaultStore = new SqliteStore({ client: new Sqlite(':memory:'), expired: { clear: false } })

      assert.strictEqual(defaultStore.maxInactivity, 7889238000)
    })

    it('should record when a session was last accessed', async () => {
      await set('abc', liveSession())

      const row = client.prepare('SELECT lastAccessed FROM sessions WHERE sid = ?').get('abc')
      assert.ok(row.lastAccessed > 0, 'lastAccessed should be stamped on write')
    })

    it('should update lastAccessed when a session is touched', async () => {
      await set('abc', liveSession())
      backdate('abc', 60000)
      const before = client.prepare('SELECT lastAccessed FROM sessions WHERE sid = ?').get('abc').lastAccessed

      await touch('abc', liveSession())

      const after = client.prepare('SELECT lastAccessed FROM sessions WHERE sid = ?').get('abc').lastAccessed
      assert.ok(after > before, `touch should refresh lastAccessed, got before=${before} after=${after}`)
    })

    it('should delete a session that has been inactive longer than maxInactivity', async () => {
      store = new SqliteStore({ client, maxInactivity: 1000, expired: { clear: false } })
      await set('dormant', longLivedSession())
      backdate('dormant', 5000)

      store.clearExpiredSessions()

      assert.strictEqual(await get('dormant'), null, 'a dormant session should be swept even though its cookie is still valid')
    })

    it('should keep a session that is still being used', async () => {
      store = new SqliteStore({ client, maxInactivity: 60000, expired: { clear: false } })
      await set('active', longLivedSession())

      store.clearExpiredSessions()

      assert.strictEqual((await get('active')).user, 'someone')
    })

    it('should keep a dormant session alive once it is touched again', async () => {
      store = new SqliteStore({ client, maxInactivity: 10000, expired: { clear: false } })
      await set('returning', longLivedSession())
      backdate('returning', 9000) // nearly swept

      await touch('returning', longLivedSession()) // the user comes back
      store.clearExpiredSessions()

      assert.strictEqual((await get('returning')).user, 'someone', 'touching should reset the inactivity clock')
    })

    it('should not sweep sessions whose cookie is still valid when maxInactivity is generous', async () => {
      store = new SqliteStore({ client, maxInactivity: 7889238000, expired: { clear: false } })
      await set('normal', longLivedSession())
      backdate('normal', 86400000) // idle for a day, well inside three months

      store.clearExpiredSessions()

      assert.strictEqual((await get('normal')).user, 'someone')
    })

    it('should add the lastAccessed column to a session file created before this feature existed', async () => {
      // build a table with the old schema, holding a session from the previous version
      const legacy = new Sqlite(':memory:')
      legacy.exec('CREATE TABLE IF NOT EXISTS sessions (sid TEXT NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TEXT NOT NULL)')
      legacy.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run('old', JSON.stringify(longLivedSession()), new Date(Date.now() + 347126472000).toISOString())

      const migrated = new SqliteStore({ client: legacy, expired: { clear: false } })

      const columns = legacy.prepare('PRAGMA table_info(sessions)').all().map(column => column.name)
      assert.ok(columns.includes('lastAccessed'), 'the column should have been added')

      // and the pre-existing session should survive rather than being swept as infinitely stale
      migrated.clearExpiredSessions()
      const row = legacy.prepare('SELECT sid FROM sessions WHERE sid = ?').get('old')
      assert.ok(row, 'an existing session should not be wiped out by the upgrade')
      legacy.close()
    })

    it('should be configurable through the expressSessionStore.maxInactivity param', async () => {
      fs.ensureDirSync(appDir)

      const app = roosevelt({
        appDir,
        makeBuildArtifacts: false,
        csrfProtection: false,
        htmlValidator: { enable: false },
        http: { enable: false },
        https: { enable: false },
        logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
        expressSession: true,
        expressSessionStore: { filename: path.join(appDir, 'configured.sqlite'), maxInactivity: 5000 }
      })

      await app.initServer()
      startedApps.push(app.expressApp)

      assert.strictEqual(app.expressApp.get('expressSessionStore').maxInactivity, 5000)
    })
  })

  describe('session cookie after a session is swept', () => {
    // an app with a session a user can log into, and an inactivity window short enough to trigger by hand
    async function startApp () {
      fs.ensureDirSync(appDir)
      const app = roosevelt({
        appDir,
        makeBuildArtifacts: false,
        csrfProtection: false,
        htmlValidator: { enable: false },
        http: { enable: false },
        https: { enable: false },
        logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
        expressSession: true,
        expressSessionStore: { filename: path.join(appDir, 'cookies.sqlite'), maxInactivity: 1000 },
        onServerInit: expressApp => {
          const router = expressApp.get('router')
          router.get('/login', (req, res) => { req.session.user = 'someone'; res.send('ok') })
          router.get('/me', (req, res) => res.send(String(req.session.user)))
        }
      })
      await app.initServer()
      startedApps.push(app.expressApp)
      return app.expressApp
    }

    it('should clear the stale cookie once the session it points at has been swept', async () => {
      const expressApp = await startApp()
      const login = await request(expressApp).get('/login')
      const cookie = login.headers['set-cookie']

      // the session works before the sweep
      assert.strictEqual((await request(expressApp).get('/me').set('Cookie', cookie)).text, 'someone')

      // age the session past its inactivity window and sweep it
      const sessionStore = expressApp.get('expressSessionStore')
      sessionStore.client.prepare('UPDATE sessions SET lastAccessed = ?').run(Date.now() - 999999)
      sessionStore.clearExpiredSessions()

      const after = await request(expressApp).get('/me').set('Cookie', cookie)
      assert.strictEqual(after.text, 'undefined', 'the session data should be gone')
      assert.ok(/connect\.sid=;/.test(String(after.headers['set-cookie'] || '')), `expected the stale cookie to be cleared, got: ${after.headers['set-cookie']}`)
    })

    it('should not clear the cookie of a session that is still valid', async () => {
      const expressApp = await startApp()
      const login = await request(expressApp).get('/login')
      const cookie = login.headers['set-cookie']

      const response = await request(expressApp).get('/me').set('Cookie', cookie)

      assert.strictEqual(response.text, 'someone')
      assert.strictEqual(/connect\.sid=;/.test(String(response.headers['set-cookie'] || '')), false, 'a live session should keep its cookie')
    })

    it('should not try to clear anything when no session cookie was presented', async () => {
      const expressApp = await startApp()

      const response = await request(expressApp).get('/me')

      assert.strictEqual(/connect\.sid=;/.test(String(response.headers['set-cookie'] || '')), false)
    })
  })
})
