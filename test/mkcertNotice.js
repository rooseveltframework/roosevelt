const { describe, it, after, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')
const selfsigned = require('selfsigned')
const tls = require('tls')
const { isTrustedByOS, mkcertInstallCommand } = require('../lib/tools/certTrust')

describe('mkcert startup notice', () => {
  // windows resolves a command through PATHEXT, so the shebang script standing in for mkcert is not executable there
  const noMkcertStub = process.platform === 'win32' ? 'the mkcert stand-in cannot be made executable on windows' : false

  const appDir = path.join(__dirname, 'app/mkcertNotice')
  const secretsPath = path.join(appDir, 'secrets')
  const binDir = path.join(appDir, 'bin')
  const caRoot = path.join(appDir, 'mkcertCA')
  const realPath = process.env.PATH

  // the same shadowing the certs generator tests use, so what these describe does not depend on whether the machine running them has mkcert
  function mkcertIsAbsent () {
    fs.outputFileSync(path.join(binDir, 'mkcert'), '#!/bin/sh\nexit 1\n')
    fs.chmodSync(path.join(binDir, 'mkcert'), 0o755)
    process.env.PATH = `${binDir}${path.delimiter}${realPath}`
  }

  function mkcertIsPresent () {
    fs.copySync(path.join(__dirname, 'util/mkcertStub.js'), path.join(binDir, 'mkcert'), { overwrite: true })
    fs.chmodSync(path.join(binDir, 'mkcert'), 0o755)
    process.env.MKCERT_STUB_CAROOT = caRoot
    process.env.PATH = `${binDir}${path.delimiter}${realPath}`
  }

  async function startAndCapture (https = {}) {
    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        appDir,
        mode: 'development',
        makeBuildArtifacts: false,
        csrfProtection: false,
        expressSession: false,
        htmlValidator: { enable: false },
        http: { enable: false },
        https: { enable: true, autoCert: true, options: { cert: 'cert.pem', key: 'key.pem' }, ...https },
        logging: { methods: { http: false, info: false, warn: true, error: false, verbose: false } }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }
    return captured
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
    delete process.env.MKCERT_STUB_CAROOT
    mkcertIsAbsent()
  })

  after(() => {
    process.env.PATH = realPath
    delete process.env.MKCERT_STUB_CAROOT
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should say how to install mkcert when it is not installed', async () => {
    const logs = await startAndCapture()

    assert.ok(logs.includes(mkcertInstallCommand()), `expected the install command for this platform, got: ${logs}`)
    assert.ok(logs.includes('mkcert -install'), 'expected it to say to trust the authority')
    assert.ok(/restart your browser/i.test(logs), 'expected it to say to restart the browser')
  })

  it('should only say to trust it when mkcert is already installed', { skip: noMkcertStub }, async () => {
    mkcertIsPresent()

    const logs = await startAndCapture()

    assert.ok(logs.includes('mkcert -install'), 'expected it to say to trust the authority')
    assert.ok(!logs.includes(mkcertInstallCommand()), 'expected it not to tell you to install something you already have')
  })

  it('should say it on every start, not just the one that wrote the certificate', async () => {
    const first = await startAndCapture()
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'cert.pem')), 'the first start should have written a certificate')

    // the second start writes nothing, since the certificate is still current, and that is exactly the start this used to go silent on
    const second = await startAndCapture()

    assert.ok(first.includes('mkcert'), 'expected the first start to mention mkcert')
    assert.ok(second.includes('mkcert'), 'expected the second start to mention it too, since nothing has been trusted yet')
  })

  it('should stay quiet when autoCertWarning is off', async () => {
    const logs = await startAndCapture({ autoCertWarning: false })

    assert.ok(!logs.includes('mkcert'), `expected nothing about mkcert, got: ${logs}`)
  })

  it('should stay quiet when autoCertWarning is off even though quieterStartup is not set', async () => {
    // the two suppressions are independent: this one silences the notice outright, rather than holding it back to once a day
    const logs = await startAndCapture({ autoCertWarning: false })

    assert.ok(!logs.includes('mkcert'), 'expected the param to work on its own')
    assert.ok(!/restart your browser/i.test(logs), 'expected no leftover advice')
  })

  it('should say nothing about a certificate the app brought itself', async () => {
    // an app pointed at a certificate of its own has its own authority behind it, which roosevelt cannot see and has no business judging
    const own = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { keySize: 2048, algorithm: 'sha256' })
    fs.outputFileSync(path.join(secretsPath, 'cert.pem'), own.cert)
    fs.outputFileSync(path.join(secretsPath, 'key.pem'), own.private)

    const logs = await startAndCapture()

    assert.ok(!logs.includes('mkcert'), `expected nothing about mkcert for an app supplied certificate, got: ${logs}`)
    assert.ok(!fs.pathExistsSync(path.join(secretsPath, 'rooseveltDevCA.pem')), 'and no authority should be made for a certificate roosevelt is never going to sign')
    assert.strictEqual(fs.readFileSync(path.join(secretsPath, 'cert.pem'), 'utf8'), own.cert, 'the app\'s own certificate should be left exactly as it was')
  })

  describe('reading this platform\'s trust store', () => {
    // every other test here expects an untrusted answer, which is also what a platform whose store roosevelt cannot read would produce
    //
    // so without this, the suite would pass on an operating system where the check never works and simply warns everybody forever
    it('should recognize a certificate that is already in the system trust store', () => {
      const system = tls.getCACertificates('system')
      assert.ok(system.length > 0, 'node reported no system trust store at all on this platform, so the check can only ever answer "untrusted"')

      const borrowed = path.join(appDir, 'borrowedFromTheSystemStore.pem')
      fs.outputFileSync(borrowed, system[0])

      assert.strictEqual(isTrustedByOS(borrowed), true, 'a certificate taken straight out of the system store should read as trusted, or the comparison does not work on this platform')
    })

    it('should not recognize a certificate that is not in it', async () => {
      const stranger = await selfsigned.generate([{ name: 'commonName', value: 'not in any store' }], { keySize: 2048, algorithm: 'sha256' })
      const strangerFile = path.join(appDir, 'stranger.pem')
      fs.outputFileSync(strangerFile, stranger.cert)

      assert.strictEqual(isTrustedByOS(strangerFile), false, 'an authority nobody installed should read as untrusted')
    })
  })

  it('should not claim anything about an authority it cannot read', () => {
    assert.strictEqual(isTrustedByOS(path.join(appDir, 'nothing-here.pem')), null, 'an unreadable authority is unknown, not untrusted, so nobody is sent to fix what is not broken')
  })
})
