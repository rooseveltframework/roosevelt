const { describe, it, after, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const certsGenerator = require('../lib/scripts/certsGenerator')
const secretsGenerator = require('../lib/scripts/secretsGenerator')
const roosevelt = require('../roosevelt')

describe('certs generator', () => {
  const appDir = path.join(__dirname, 'app/certsGenerator')
  const secretsPath = path.join(appDir, 'secrets')

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should write a key and a cert to the secrets path', async () => {
    await certsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'key.pem')))
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'cert.pem')))
  })

  it('should write certs that look like valid pem', async () => {
    await certsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    const key = fs.readFileSync(path.join(secretsPath, 'key.pem'), 'utf8')
    const cert = fs.readFileSync(path.join(secretsPath, 'cert.pem'), 'utf8')
    assert.ok(key.startsWith('-----BEGIN'), `expected a pem key, got: ${key.slice(0, 40)}`)
    assert.ok(cert.startsWith('-----BEGIN CERTIFICATE-----'), `expected a pem cert, got: ${cert.slice(0, 40)}`)
  })

  it('should not overwrite certs that already exist', async () => {
    fs.outputFileSync(path.join(secretsPath, 'key.pem'), 'existing key')
    fs.outputFileSync(path.join(secretsPath, 'cert.pem'), 'existing cert')

    await certsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    assert.strictEqual(fs.readFileSync(path.join(secretsPath, 'key.pem'), 'utf8'), 'existing key')
    assert.strictEqual(fs.readFileSync(path.join(secretsPath, 'cert.pem'), 'utf8'), 'existing cert')
  })

  it('should write nothing when the https options name no key and cert', async () => {
    await certsGenerator(secretsPath, {})

    assert.strictEqual(fs.pathExistsSync(path.join(secretsPath, 'key.pem')), false)
  })

  it('should generate certs and a session secret together', async () => {
    await secretsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'key.pem')))
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'cert.pem')))
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'sessionSecret.json')))
  })

  it('should be triggered by an app running in development mode with autoCert enabled', async () => {
    const app = roosevelt({
      appDir,
      mode: 'development',
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      htmlValidator: { enable: false },
      frontendReload: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, error: false, verbose: false } },
      secretsPath: 'secrets',
      http: { enable: false },
      https: {
        enable: true,
        autoCert: true,
        port: 30008,
        options: { key: 'key.pem', cert: 'cert.pem' }
      }
    })

    await app.initServer()

    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'key.pem')), 'autoCert should have generated a key')
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'cert.pem')), 'autoCert should have generated a cert')
  })
})
