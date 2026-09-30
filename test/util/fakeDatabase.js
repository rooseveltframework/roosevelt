// a stand-in for postgresql or mysql, which answers the statements the database session stores make, keeping sessions in memory, so the stores can be tested without a database server. it hands results back the way the driver it is standing in for does: pg's { rows }, mysql2's [rows, fields], or mariadb's rows. a statement it does not know is an error, so a change to a store's sql has to be made here too
module.exports = (driver = 'pg') => {
  const sessions = new Map()
  const answer = rows => driver === 'mysql2' ? [rows, []] : driver === 'mariadb' ? rows : { rows }
  const placeholders = driver === 'pg' ? /\$\d+/g : /\?/g
  return {
    sessions,
    statements: [],
    async query (sql, params = []) {
      this.statements.push(sql)
      if (driver !== 'pg' && /\$\d/.test(sql)) throw new Error(`${driver} does not number its placeholders: ${sql}`)
      if (driver === 'pg' && /\?/.test(sql)) throw new Error(`pg numbers its placeholders: ${sql}`)
      const s = sql.replace(/\s+/g, ' ').trim().replace(placeholders, '?')
      if (/^CREATE /.test(s)) return answer([])
      if (/^INSERT INTO \w+ \(sid, sess, expire, last_accessed\) VALUES \(\?, \?, \?, \?\) ON (CONFLICT \(sid\) DO UPDATE|DUPLICATE KEY UPDATE)/.test(s)) {
        sessions.set(params[0], { sid: params[0], sess: params[1], expire: params[2], last_accessed: params[3] }) // kept as the text it was given, which mariadb hands back as it is
        return answer([])
      }
      const parsed = row => driver === 'mariadb' ? row.sess : JSON.parse(row.sess) // pg and mysql2 hand json back parsed
      if (/^SELECT sess FROM \w+ WHERE sid = \? AND expire > \?$/.test(s)) {
        const row = sessions.get(params[0])
        return answer(row && row.expire > params[1] ? [{ sess: parsed(row) }] : [])
      }
      if (/^DELETE FROM \w+ WHERE sid = \?$/.test(s)) {
        sessions.delete(params[0])
        return answer([])
      }
      if (/^UPDATE \w+ SET expire = \?, last_accessed = \? WHERE sid = \? AND expire > \?$/.test(s)) {
        const row = sessions.get(params[2])
        if (row && row.expire > params[3]) Object.assign(row, { expire: params[0], last_accessed: params[1] })
        return answer([])
      }
      if (/^SELECT COUNT\(\*\) AS count FROM \w+$/.test(s)) return answer([{ count: driver === 'pg' ? String(sessions.size) : BigInt(sessions.size) }]) // pg hands a count back as text, and the mysql drivers as a bigint
      if (/^DELETE FROM \w+ WHERE expire <= \?$/.test(s)) {
        for (const [sid, row] of sessions) if (row.expire <= params[0]) sessions.delete(sid)
        return answer([])
      }
      if (/^DELETE FROM \w+ WHERE last_accessed IS NOT NULL AND last_accessed < \?$/.test(s)) {
        for (const [sid, row] of sessions) if (row.last_accessed !== null && row.last_accessed < params[0]) sessions.delete(sid)
        return answer([])
      }
      if (/^DELETE FROM \w+$/.test(s)) {
        sessions.clear()
        return answer([])
      }
      if (/^SELECT sid, sess FROM \w+ WHERE expire > \?$/.test(s)) return answer([...sessions.values()].filter(row => row.expire > params[0]).map(row => ({ sid: row.sid, sess: parsed(row) })))
      throw new Error(`the fake database does not know this statement: ${s}`)
    }
  }
}
