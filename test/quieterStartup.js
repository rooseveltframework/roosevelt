const { describe, it, after, before, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('quieter startup', () => {
  // the app directory is new on every run, so no record left behind by an earlier run that stopped part way can belong to it
  const appDir = path.join(__dirname, `app/quieterStartup-${process.pid}-${Date.now()}`)
  // roosevelt names the record after a hash of the app directory, and working that out a second time here is a way for this test to quietly stop looking at the file the app actually wrote
  //
  // so the record is found rather than recomputed: it is whichever record was not in the temp directory before these tests began. the records that were are other apps', such as the ones you develop on this machine, and are never read or deleted here
  const recordPattern = /^roosevelt-notices-.*\.json$/
  let existingRecords

  function records () {
    return fs.readdirSync(os.tmpdir()).filter(name => recordPattern.test(name) && !existingRecords.has(name)).map(name => path.join(os.tmpdir(), name))
  }

  function removeRecords () {
    for (const file of records()) fs.removeSync(file)
  }

  // ages every remembered notice past the point where roosevelt holds it back
  function backdateRecords () {
    for (const file of records()) {
      const record = fs.readJsonSync(file)
      for (const key of Object.keys(record)) record[key] = Date.now() - 86400001
      fs.outputJsonSync(file, record)
    }
  }

  // starts an app and reports how many repeated notices it printed
  async function countNotices (quieterStartup) {
    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        appDir,
        makeBuildArtifacts: false,
        csrfProtection: false,
        expressSession: false,
        htmlValidator: { enable: false },
        http: { enable: false },
        https: { enable: false },
        logging: { quieterStartup, methods: { http: false, info: false, warn: true, error: false, verbose: false } }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }
    // only warnings are switched on above and each repeated notice is one line, so counting lines counts notices
    //
    // counting the emoji prefix instead reports zero on windows, where roosevelt-logger leaves prefixes off by default
    return captured.split('\n').filter(line => line.trim()).length
  }

  before(() => {
    existingRecords = new Set(fs.readdirSync(os.tmpdir()).filter(name => recordPattern.test(name)))
  })

  beforeEach(() => {
    removeRecords()
    fs.ensureDirSync(appDir)
  })

  after(() => {
    removeRecords()
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should repeat notices on every start by default', async () => {
    assert.ok(await countNotices(false) > 0, 'the first start should print notices')
    assert.ok(await countNotices(false) > 0, 'so should the second')
    assert.ok(await countNotices(false) > 0, 'and the third')
  })

  it('should show notices once and then hold them back when quieterStartup is on', async () => {
    assert.ok(await countNotices(true) > 0, 'the first start should still print them')
    assert.strictEqual(await countNotices(true), 0, 'a restart should not repeat them')
    assert.strictEqual(await countNotices(true), 0, 'nor should the one after that')
  })

  it('should record what it has shown outside the app directory, so it survives a wiped build folder', async () => {
    await countNotices(true)

    assert.ok(records().length, 'the record should live in the temp directory')
    assert.ok(records().some(file => Object.keys(fs.readJsonSync(file)).length > 0), 'it should name the notices it showed')
  })

  it('should show notices again once the record is cleared', async () => {
    await countNotices(true)
    assert.strictEqual(await countNotices(true), 0)

    removeRecords()

    assert.ok(await countNotices(true) > 0, 'clearing the record brings the notices back')
  })

  it('should show notices again once a day has passed', async () => {
    await countNotices(true)
    assert.strictEqual(await countNotices(true), 0)

    // backdate everything every record remembers by just over a day, rather than singling one out and hoping it is the one the app reads
    backdateRecords()

    assert.ok(await countNotices(true) > 0, 'notices should return after a day')
  })

  it('should not hold back notices that mean something is wrong', async () => {
    // a missing favicon is a mistake rather than a statement of intent, so it is not a repeated notice
    let captured = ''
    captureLogs.start()
    try {
      for (let i = 0; i < 2; i++) {
        await roosevelt({
          appDir,
          makeBuildArtifacts: false,
          csrfProtection: false,
          expressSession: false,
          htmlValidator: { enable: false },
          http: { enable: false },
          https: { enable: false },
          favicon: 'nonexistent.ico',
          logging: { quieterStartup: true, methods: { http: false, info: false, warn: true, error: false, verbose: false } }
        }).initServer()
      }
    } finally {
      captured = captureLogs.stop()
    }

    assert.strictEqual((captured.match(/Favicon/g) || []).length, 2, 'the favicon warning should print both times')
  })
})
