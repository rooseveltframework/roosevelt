// roosevelt's session stores: the default store, which keeps sessions in a sqlite file on the server the app runs on, and stores that keep them in a database every server running the app can reach, postgresql, or mysql or mariadb. each works the same way, with the same expiry, and the same clearing out of sessions nobody has come back to
//
// the sqlite store began as a hard fork of better-sqlite3-session-store: https://github.com/attestate/better-sqlite3-session-store, with the changes from this PR: https://github.com/attestate/better-sqlite3-session-store/pull/12 plus other new features and fixes we made on top of it. its table is the same as it has always been, so a session file made by an earlier version of roosevelt keeps its sessions
//
// the sqlite store's client is a better-sqlite3 database, which answers straight away, so it answers straight away too. the others' client is anything with a query(sql, params) method, which is how every one of those databases' drivers and pools are queried: a pg Pool, a mysql2 pool, a mariadb pool, or the app's own database, whatever it uses. what it resolves to differs between them, { rows } from pg, [rows, fields] from mysql2, and the rows themselves from mariadb, and each is understood, as is { error } from a client that reports a failed query that way rather than by rejecting
//
// their times are milliseconds since 1970 in plain integer columns, rather than each database's own kind of timestamp, so that they mean the same in every database, whatever its time zone. the sqlite store's expiry is an iso 8601 date instead, as it always has been, which compares the same way, since each is written the same length, in utc
const noop = () => {}

const oneDay = 86400000
const clearExpiredInterval = 900000 // 15 min
const defaultMaxInactivity = 7889238000 // 3 months

// the rows a query resolved to, whichever of the drivers' ways it was handed back
function rowsOf (result) {
  if (result?.error) throw result.error
  if (Array.isArray(result)) return Array.isArray(result[0]) ? result[0] : result // mysql2's [rows, fields], or mariadb's rows
  return result?.rows ?? []
}

const ms = time => time
const parse = sess => typeof sess === 'string' ? JSON.parse(sess) : sess // pg and mysql2 hand json back parsed, and mariadb and sqlite as text

// what differs between the databases: querying the client, how a query's values are written into it, the table, how a time is kept, and replacing a session that is already there
const dialects = {
  sqlite: {
    name: 'SqliteStore',
    hasClient: client => typeof client?.prepare === 'function',
    clientError: 'A client must be directly provided to the SQLite session store: a better-sqlite3 database',
    // a statement that reads, such as a select, answers with its rows, and one that writes with what it changed
    query: (client, sql, params = []) => {
      const statement = client.prepare(sql)
      return statement.reader ? statement.all(...params) : statement.run(...params)
    },
    placeholder: () => '?',
    time: time => new Date(time).toISOString(),
    lastAccessed: 'lastAccessed',
    create: table => [
      `CREATE TABLE IF NOT EXISTS ${table} (sid TEXT NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TEXT NOT NULL, lastAccessed INTEGER)`,
      `CREATE INDEX IF NOT EXISTS ${table}_expire_index ON ${table} (expire)`
    ],
    // a session file made before sessions were cleared out for being left alone has no lastAccessed column, so it is added, with every session in it counted as used now, rather than as never used, which would clear them all out
    upgrade: store => {
      if (store.query(`PRAGMA table_info(${store.table})`).some(column => column.name === 'lastAccessed')) return
      store.query(`ALTER TABLE ${store.table} ADD COLUMN lastAccessed INTEGER`)
      store.query(`UPDATE ${store.table} SET lastAccessed = ?`, [Date.now()])
    },
    upsert: table => `INSERT OR REPLACE INTO ${table} (sid, sess, expire, lastAccessed) VALUES (?, ?, ?, ?)`,
    rawAll: true // all() has always answered with the table's rows, rather than the sessions in them, so it still does
  },
  postgres: {
    name: 'PostgresStore',
    hasClient: client => typeof client?.query === 'function',
    clientError: 'A client with a query method, such as a connection pool, must be provided to the PostgreSQL session store',
    query: async (client, sql, params) => rowsOf(await client.query(sql, params)),
    placeholder: n => `$${n}`,
    time: ms,
    lastAccessed: 'last_accessed',
    create: table => [
      `CREATE TABLE IF NOT EXISTS ${table} (sid TEXT NOT NULL PRIMARY KEY, sess JSONB NOT NULL, expire BIGINT NOT NULL, last_accessed BIGINT)`,
      `CREATE INDEX IF NOT EXISTS ${table}_expire_index ON ${table} (expire)`
    ],
    upsert: table => `INSERT INTO ${table} (sid, sess, expire, last_accessed) VALUES (?, ?, ?, ?) ON CONFLICT (sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire, last_accessed = excluded.last_accessed`
  },
  mysql: {
    name: 'MysqlStore',
    hasClient: client => typeof client?.query === 'function',
    clientError: 'A client with a query method, such as a connection pool, must be provided to the MySQL or MariaDB session store',
    query: async (client, sql, params) => rowsOf(await client.query(sql, params)),
    placeholder: () => '?',
    time: ms,
    lastAccessed: 'last_accessed',
    create: table => [
      `CREATE TABLE IF NOT EXISTS ${table} (sid VARCHAR(255) NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire BIGINT NOT NULL, last_accessed BIGINT, INDEX ${table}_expire_index (expire))` // mysql cannot create an index only if it is not there, so it is made with the table
    ],
    upsert: table => `INSERT INTO ${table} (sid, sess, expire, last_accessed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE sess = VALUES(sess), expire = VALUES(expire), last_accessed = VALUES(last_accessed)` // VALUES(), which mariadb has, rather than mysql's newer row alias, which it does not
  }
}

// what comes of a value once it is there: straight away for one that is already there, such as the sqlite store's answers, or once a promise resolves, for the other stores'
const after = (value, next) => value instanceof Promise ? value.then(next) : next(value)

module.exports = ({ Store }, dialectName = 'sqlite') => {
  const dialect = dialects[dialectName]
  if (!dialect) throw new Error(`There is no ${dialectName} session store`)

  class SessionStore extends Store {
    constructor (options = {}) {
      super(options)
      if (!dialect.hasClient(options.client)) throw new Error(dialect.clientError)
      this.client = options.client
      this.table = options.table || 'sessions'
      if (!/^[a-z_][a-z0-9_]*$/i.test(this.table)) throw new Error(`The session store's table name must be a plain name, which ${this.table} is not`)
      // how long a session may go untouched before it is deleted, regardless of how far off its cookie expiry is
      //
      // this is separate from cookie.maxAge on purpose: maxAge decides how long a user stays logged in, this decides how long an abandoned session is kept
      this.maxInactivity = options.maxInactivity ?? defaultMaxInactivity
      this.expired = {
        // nullish coalescing rather than || so that clearing can actually be switched off; `false || true` would always be true
        clear: options.expired?.clear ?? true,
        intervalMs: options.expired?.intervalMs ?? clearExpiredInterval,
        unrefInterval: options.expired?.unrefInterval ?? false
      }
      // every method waits for the table. the sqlite store's is made straight away, and the others' the first time they are used
      this.ready = this.createTable()
      if (this.ready instanceof Promise) this.ready.catch(() => {}) // reported by the first method that waits for it, rather than as an unhandled rejection
      if (this.expired.clear) {
        this.interval = setInterval(() => this.clearExpiredSessions(), this.expired.intervalMs)
        if (this.expired.unrefInterval) this.interval.unref()
      }
    }

    // a query, with its values written as the database writes them, numbered in the order they appear
    query (sql, params) {
      let n = 0
      return dialect.query(this.client, sql.replace(/\?/g, () => dialect.placeholder(++n)), params)
    }

    createTable () {
      const statements = dialect.create(this.table)
      const next = i => i < statements.length ? after(this.query(statements[i]), () => next(i + 1)) : dialect.upgrade?.(this)
      return next(0)
    }

    // runs an operation once the table is there, handing its result or error to express-session's callback, once
    run (operation, cb) {
      let result
      try {
        result = after(this.ready, operation)
      } catch (err) {
        cb(err)
        return
      }
      if (result instanceof Promise) result.then(value => cb(null, value), err => cb(err))
      else cb(null, result)
    }

    // the sqlite store's are cleared out by the time this returns, and the others' once what it returns resolves
    clearExpiredSessions () {
      const report = err => console.error(err)
      try {
        const cleared = after(this.ready, () => after(
          this.query(`DELETE FROM ${this.table} WHERE expire <= ?`, [dialect.time(Date.now())]),
          // sessions whose cookie is still valid but which nobody has used in a long time are cleared out too, so that abandoned sessions do not pile up behind a distant cookie expiry
          () => this.query(`DELETE FROM ${this.table} WHERE ${dialect.lastAccessed} IS NOT NULL AND ${dialect.lastAccessed} < ?`, [Date.now() - this.maxInactivity])
        ))
        if (cleared instanceof Promise) return cleared.then(noop, report)
      } catch (err) {
        report(err)
      }
    }

    set (sid, sess, cb = noop) {
      // express' temporal unit of choice is milliseconds: https://expressjs.com/en/resources/middleware/session.html#:~:text=cookie.maxAge
      const now = Date.now()
      this.run(() => this.query(dialect.upsert(this.table), [sid, JSON.stringify(sess), dialect.time(now + (sess.cookie?.maxAge || oneDay)), now]), cb)
    }

    get (sid, cb = noop) {
      this.run(() => after(this.query(`SELECT sess FROM ${this.table} WHERE sid = ? AND expire > ?`, [sid, dialect.time(Date.now())]), ([row]) => row ? parse(row.sess) : null), cb)
    }

    destroy (sid, cb = noop) {
      this.run(() => this.query(`DELETE FROM ${this.table} WHERE sid = ?`, [sid]), cb)
    }

    touch (sid, sess, cb = noop) {
      const expire = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + oneDay
      this.run(() => this.query(`UPDATE ${this.table} SET expire = ?, ${dialect.lastAccessed} = ? WHERE sid = ? AND expire > ?`, [dialect.time(expire), Date.now(), sid, dialect.time(Date.now())]), cb)
    }

    length (cb = noop) {
      this.run(() => after(this.query(`SELECT COUNT(*) AS count FROM ${this.table}`), ([row]) => Number(row.count)), cb) // a count comes back as a string or a bigint from some drivers
    }

    clear (cb = noop) {
      this.run(() => this.query(`DELETE FROM ${this.table}`), cb)
    }

    all (cb = noop) {
      if (dialect.rawAll) return this.run(() => this.query(`SELECT * FROM ${this.table}`), cb)
      this.run(() => after(this.query(`SELECT sid, sess FROM ${this.table} WHERE expire > ?`, [dialect.time(Date.now())]), rows => rows.map(row => ({ ...parse(row.sess), id: row.sid }))), cb)
    }

    // stops clearing out expired sessions, for an app shutting down, or a test
    close () {
      clearInterval(this.interval)
    }
  }

  Object.defineProperty(SessionStore, 'name', { value: dialect.name })
  return SessionStore
}

module.exports.dialects = Object.keys(dialects)
