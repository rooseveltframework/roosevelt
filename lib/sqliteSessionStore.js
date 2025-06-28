// this is a hard fork of better-sqlite3-session-store: https://github.com/attestate/better-sqlite3-session-store
// this fork includes the changes from this PR: https://github.com/attestate/better-sqlite3-session-store/pull/12

const noop = () => {}

const oneDay = 86400000
const clearExpiredInterval = 900000
const tableName = 'sessions'
const schema = `
  CREATE TABLE IF NOT EXISTS ${tableName}
  (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  )
`

module.exports = ({ Store }) => {
  class SqliteStore extends Store {
    constructor (options = {}) {
      super(options)

      if (!options.client) {
        throw new Error('A client must be directly provided to SqliteStore')
      }

      this.expired = {
        clear: (options.expired && options.expired.clear) || true,
        intervalMs:
         (options.expired && options.expired.intervalMs) ||
          clearExpiredInterval,
        unrefInterval: (options.expired && options.expired.unrefInterval) ||
          false
      }
      this.client = options.client
      this.createDb()

      if (this.expired.clear) {
        this.startInterval()
      }
    }

    startInterval () {
      const timeout = setInterval(
        this.clearExpiredSessions.bind(this),
        this.expired.intervalMs
      )
      if (this.expired.unrefInterval) {
        timeout.unref()
      }
    }

    clearExpiredSessions () {
      try {
        this.client
          .prepare(`DELETE FROM ${tableName} WHERE datetime('now') > datetime(expire)`)
          .run()
      } catch (err) {
        console.error(err)
      }
    }

    createDb () {
      this.client.exec(schema)
    }

    set (sid, sess, cb = noop) {
      let age
      // express' temporal unit of choice is milliseconds: https://expressjs.com/en/resources/middleware/session.html#:~:text=cookie.maxAge
      if (sess.cookie && sess.cookie.maxAge) {
        age = sess.cookie.maxAge
      } else {
        age = oneDay
      }

      const now = new Date().getTime()
      const expire = new Date(now + age).toISOString()
      const entry = { sid, sess: JSON.stringify(sess), expire }

      let res
      try {
        res = this.client
          .prepare(`
            INSERT OR REPLACE INTO
              ${tableName}
            VALUES
              (
                @sid,
                @sess,
                @expire
              )
          `)
          .run(entry)
      } catch (err) {
        cb(err)
        return
      }

      cb(null, res)
    }

    get (sid, cb = noop) {
      let res

      try {
        res = this.client
          .prepare(`
            SELECT sess
            FROM ${tableName}
            WHERE sid = @sid AND datetime('now') < datetime(expire)
          `)
          .get({ sid })
      } catch (err) {
        cb(err)
        return
      }

      if (res && res.sess) {
        cb(null, JSON.parse(res.sess))
      } else {
        cb(null, null)
      }
    }

    destroy (sid, cb = noop) {
      let res

      try {
        res = this.client
          .prepare(`DELETE FROM ${tableName} WHERE sid = ?`)
          .run(sid)
      } catch (err) {
        cb(err)
        return
      }
      cb(null, res)
    }

    length (cb = noop) {
      let res

      try {
        res = this.client
          .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
          .get()
      } catch (err) {
        cb(err)
        return
      }

      cb(null, res.count)
    }

    clear (cb = noop) {
      let res

      try {
        res = this.client.prepare(`DELETE FROM ${tableName}`).run()
      } catch (err) {
        cb(err)
        return
      }

      cb(null, res)
    }

    touch (sid, sess, cb = noop) {
      const entry = { sid }
      if (sess && sess.cookie && sess.cookie.expires) {
        entry.expire = new Date(sess.cookie.expires).toISOString()
      } else {
        const now = new Date().getTime()
        entry.expire = new Date(now + oneDay).toISOString()
      }

      let res
      try {
        res = this.client
          .prepare(`
            UPDATE ${tableName}
            SET expire = @expire
            WHERE sid = @sid AND datetime('now') < datetime(expire)
          `)
          .run(entry)
      } catch (err) {
        cb(err)
        return
      }

      cb(null, res)
    }

    all (cb = noop) {
      let res
      try {
        res = this.client
          .prepare(`
            SELECT * FROM ${tableName}
          `)
          .all()
      } catch (err) {
        cb(err)
        return
      }

      cb(null, res)
    }
  }

  return SqliteStore
}
