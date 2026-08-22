const { describe, it, after } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const expressVersion = require('../lib/tools/expressVersion')

describe('express version support', () => {
  const appDir = path.join(__dirname, 'app/expressVersion')
  const installedMajor = parseInt(require('express/package.json').version.split('.')[0], 10)

  async function startApp () {
    fs.ensureDirSync(appDir)
    const app = roosevelt({
      appDir,
      makeBuildArtifacts: false,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      http: { enable: false },
      https: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      onServerInit: expressApp => expressApp.get('router').route('/real').get((req, res) => res.send('real route'))
    })
    await app.initServer()
    return app.expressApp
  }

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should detect the major version of the express the app installed', () => {
    assert.strictEqual(expressVersion, installedMajor)
  })

  it('should be running an express major that roosevelt supports', () => {
    assert.ok([4, 5].includes(installedMajor), `roosevelt supports express 4 and 5, but express ${installedMajor} is installed`)
  })

  it('should build the app out of the express the user installed', async () => {
    const expressApp = await startApp()

    // express 4 keeps the `del` alias for `delete`, express 5 dropped it, so it tells the two apart without reading a version
    if (installedMajor === 4) assert.strictEqual(typeof expressApp.del, 'function', 'an express 4 app should still have the del alias')
    else assert.strictEqual(typeof expressApp.del, 'undefined', 'an express 5 app should not have the del alias')
  })

  it('should serve a normal route on the installed express', async () => {
    const expressApp = await startApp()

    assert.strictEqual((await request(expressApp).get('/real')).text, 'real route')
  })

  it('should serve roosevelt\'s own 404 page for unmatched routes on the installed express', async () => {
    // express answers an unmatched route with a bare 404 of its own, so the status alone proves nothing
    // roosevelt's catch all is spelled differently in express 4 and 5, and picking the wrong one means express answers instead of roosevelt
    const expressApp = await startApp()

    const response = await request(expressApp).get('/no/such/route')
    assert.strictEqual(response.status, 404)
    assert.ok(response.text.includes('<title>404 Not Found</title>'), `expected the roosevelt 404 page, got: ${JSON.stringify(response.text.slice(0, 120))}`)
  })
})
