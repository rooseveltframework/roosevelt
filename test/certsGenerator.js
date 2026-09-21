const { describe, it, after, beforeEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const certsGenerator = require('../lib/scripts/certsGenerator')
const secretsGenerator = require('../lib/scripts/secretsGenerator')
const roosevelt = require('../roosevelt')

describe('certs generator', () => {
  // windows resolves a command through PATHEXT, so a shebang script named `mkcert` with no extension is not executable there, and node refuses to spawn a .cmd without a shell
  //
  // these skip rather than run against an mkcert that is never found, which is worse than not running at all: two of them passed that way on windows, because a certificate roosevelt signs also covers localhost
  const noMkcertStub = process.platform === 'win32' ? 'the mkcert stand-in cannot be made executable on windows' : false

  // windows has no posix permission bits; fs.chmod can only toggle the read only flag there, so the mode roosevelt asks for is never what comes back
  const noFileModes = process.platform === 'win32' ? 'windows does not implement posix file modes' : false

  const appDir = path.join(__dirname, 'app/certsGenerator')
  const secretsPath = path.join(appDir, 'secrets')

  // roosevelt hands the job to mkcert when it finds it, so whether these tests are describing roosevelt's own certificates or mkcert's would otherwise depend on whether the machine running them happens to have mkcert installed
  //
  // so every test starts from a path where mkcert is not found, and the ones that are about mkcert put a stand-in there themselves. only the name is shadowed, so anything else the tests run still resolves normally
  const binDir = path.join(appDir, 'bin')
  const realPath = process.env.PATH

  function mkcertIsAbsent () {
    fs.outputFileSync(path.join(binDir, 'mkcert'), '#!/bin/sh\nexit 1\n')
    fs.chmodSync(path.join(binDir, 'mkcert'), 0o755)
    process.env.PATH = `${binDir}${path.delimiter}${realPath}`
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
    mkcertIsAbsent()
  })

  after(() => {
    process.env.PATH = realPath
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should write a key and a cert to the secrets path', async () => {
    await certsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'key.pem')))
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'cert.pem')))
  })

  it('should keep the development authority inside the app', async () => {
    const result = await certsGenerator(secretsPath, { key: 'key.pem', cert: 'cert.pem' })

    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'rooseveltDevCA.pem')), 'the authority should sit beside the certificate it signed')
    assert.ok(fs.pathExistsSync(path.join(secretsPath, 'rooseveltDevCA-key.pem')))

    // what this is really about is where the authority is not: one written outside the app outlives the app, is missed by deleting it, and leaves a key that can sign for any host somewhere nobody thought to look
    //
    // every other test here passes a path of its own, so nothing exercised the default until this one
    assert.ok(result.caCertPath.startsWith(appDir), `the authority should be inside the app, got: ${result.caCertPath}`)
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

  // what the certificate has to say to be usable, as opposed to merely existing
  describe('what the certificate says', () => {
    const { X509Certificate } = require('crypto')
    const https = require('https')
    const { execFileSync } = require('child_process')
    const caPath = path.join(appDir, 'ca')

    async function generate (into = secretsPath) {
      await certsGenerator(into, { cert: 'cert.pem', key: 'key.pem' }, caPath)
      return {
        cert: fs.readFileSync(path.join(into, 'cert.pem')),
        key: fs.readFileSync(path.join(into, 'key.pem'))
      }
    }

    function serve (key, cert, port, ca) {
      return (async () => {
        const server = https.createServer({ key, cert }, (req, res) => res.end('ok'))
        await new Promise(resolve => server.listen(port, resolve))
        try {
          return await new Promise((resolve, reject) => {
            https.get({ host: 'localhost', port, path: '/', ca }, res => {
              res.resume()
              resolve(res.statusCode)
            }).on('error', reject)
          })
        } finally {
          await new Promise(resolve => server.close(resolve))
        }
      })()
    }

    it('should issue it for localhost rather than for the library\'s placeholder', async () => {
      const { cert } = await generate()

      assert.match(new X509Certificate(cert).subject, /CN=localhost/)
    })

    it('should give it the subject alternative names browsers match hosts against', async () => {
      // a certificate without these is refused for the wrong host no matter whose trust store it has been added to, which is what made the ones roosevelt used to generate impossible to trust rather than merely untrusted
      const { cert } = await generate()
      const { subjectAltName } = new X509Certificate(cert)

      assert.ok(subjectAltName, 'there should be a subjectAltName at all')
      for (const expected of ['DNS:localhost', 'IP Address:127.0.0.1']) {
        assert.ok(subjectAltName.includes(expected), `expected ${expected}, got: ${subjectAltName}`)
      }
    })

    it('should keep the extensions that naming any of them would otherwise replace', async () => {
      // naming an extension swaps out the library's defaults rather than adding to them, so the key usages have to be listed alongside everything else or they go missing
      const { cert } = await generate()
      const text = execFileSync('openssl', ['x509', '-noout', '-text'], { input: cert, encoding: 'utf8' })

      assert.match(text, /TLS Web Server Authentication/)
      assert.match(text, /Digital Signature/)
    })

    it('should sign it with a development authority rather than with itself', async () => {
      const { cert } = await generate()
      const parsed = new X509Certificate(cert)

      assert.match(parsed.issuer, /CN=Roosevelt Development CA/, `expected the authority to have signed it, got: ${parsed.issuer}`)
      assert.notStrictEqual(parsed.subject, parsed.issuer, 'signing itself is what this replaced')
      assert.strictEqual(parsed.ca, false, 'the certificate an app serves should not itself be an authority')
    })

    it('should reuse one authority across apps, which is the point of having one', async () => {
      // trusting it is something a developer does once, so a second app has to be signed by the same one, or they would be trusting a new authority per app, which is what a self signed certificate already amounted to
      const first = await generate()
      const second = await generate(path.join(appDir, 'anotherApp'))

      assert.strictEqual(new X509Certificate(first.cert).issuer, new X509Certificate(second.cert).issuer)
      assert.notStrictEqual(first.cert.toString(), second.cert.toString(), 'each app still gets its own certificate')
    })

    it('should let a client that trusts only the authority accept an app\'s certificate', async () => {
      // this is the whole point: the authority is installed once and everything it signs is accepted afterwards
      const { cert, key } = await generate()
      const ca = [fs.readFileSync(path.join(caPath, 'rooseveltDevCA.pem'))]

      assert.strictEqual(await serve(key, cert, 21445, ca), 200)
    })

    it('should still refuse a certificate signed by some other authority', async () => {
      // trusting the authority has to mean something, so anything it did not sign stays refused
      const { cert, key } = await generate(path.join(appDir, 'elsewhere'))
      const otherCa = [fs.readFileSync(path.join(caPath, 'rooseveltDevCA.pem'))]
      await certsGenerator(path.join(appDir, 'rogue'), { cert: 'cert.pem', key: 'key.pem' }, path.join(appDir, 'otherCa'))
      const rogueCert = fs.readFileSync(path.join(appDir, 'rogue/cert.pem'))
      const rogueKey = fs.readFileSync(path.join(appDir, 'rogue/key.pem'))

      assert.strictEqual(await serve(key, cert, 21446, otherCa), 200, 'the real one should still work')
      await assert.rejects(serve(rogueKey, rogueCert, 21447, otherCa), 'one from another authority should not')
    })

    it('should keep the authority\'s key readable only by the developer it belongs to', { skip: noFileModes }, async () => {
      // this key can sign a certificate for any host, so it is not something to leave world readable
      await generate()

      const mode = fs.statSync(path.join(caPath, 'rooseveltDevCA-key.pem')).mode & 0o777
      assert.strictEqual(mode, 0o600, `expected 600, got ${mode.toString(8)}`)
    })
  })

  // roosevelt replaces the certificates it signed once they are near expiring, and nothing else
  describe('renewing what it signed', () => {
    const { X509Certificate } = require('crypto')
    const selfsigned = require('selfsigned')
    const caPath = path.join(appDir, 'ca')

    const generate = async () => certsGenerator(secretsPath, { cert: 'cert.pem', key: 'key.pem' }, caPath)
    const certOnDisk = () => fs.readFileSync(path.join(secretsPath, 'cert.pem'), 'utf8')

    // writes a certificate signed by the real authority but dated so that it is nearly out of time
    async function writeExpiringCert (daysLeft) {
      const ca = {
        cert: fs.readFileSync(path.join(caPath, 'rooseveltDevCA.pem'), 'utf8'),
        key: fs.readFileSync(path.join(caPath, 'rooseveltDevCA-key.pem'), 'utf8')
      }
      const notAfter = new Date()
      notAfter.setDate(notAfter.getDate() + daysLeft)
      const pem = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
        keySize: 2048, algorithm: 'sha256', ca, notAfterDate: notAfter
      })
      fs.outputFileSync(path.join(secretsPath, 'cert.pem'), pem.cert)
      fs.outputFileSync(path.join(secretsPath, 'key.pem'), pem.private)
      return pem.cert
    }

    it('should leave a certificate of its own alone while it still has plenty of time', async () => {
      await generate()
      const first = certOnDisk()

      await generate()

      assert.strictEqual(certOnDisk(), first, 'nothing was near expiring, so nothing should have been rewritten')
    })

    it('should replace one of its own that is nearly out of time', async () => {
      await generate() // so the authority exists
      const nearlyExpired = await writeExpiringCert(5)

      await generate()

      assert.notStrictEqual(certOnDisk(), nearlyExpired, 'it should have been replaced')
      assert.ok(new Date(new X509Certificate(certOnDisk()).validTo) > new Date(new X509Certificate(nearlyExpired).validTo), 'and the replacement should last longer')
    })

    it('should replace one of its own that has already expired', async () => {
      await generate()
      const expired = await writeExpiringCert(-1)

      await generate()

      assert.notStrictEqual(certOnDisk(), expired)
      assert.ok(new Date(new X509Certificate(certOnDisk()).validTo) > new Date(), 'the replacement should be valid now')
    })

    it('should replace one of its own whose authority is gone, since nothing would trust it any more', async () => {
      await generate()
      const orphaned = certOnDisk()
      fs.rmSync(caPath, { recursive: true, force: true }) // as if the developer cleared their authority

      await generate()

      assert.notStrictEqual(certOnDisk(), orphaned, 'a certificate signed by an authority that no longer exists is unusable')
      assert.ok(new X509Certificate(certOnDisk()).checkIssued(new X509Certificate(fs.readFileSync(path.join(caPath, 'rooseveltDevCA.pem')))), 'and the replacement should be signed by the new one')
    })

    it('should never replace a certificate it did not sign, however old it is', async () => {
      // an app pointed at its own certificate, from mkcert or anywhere else, is not roosevelt's to overwrite
      await generate() // so the authority exists
      const notOurs = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
        keySize: 2048, algorithm: 'sha256', notAfterDate: new Date(Date.now() - 86400000)
      })
      fs.outputFileSync(path.join(secretsPath, 'cert.pem'), notOurs.cert)
      fs.outputFileSync(path.join(secretsPath, 'key.pem'), notOurs.private)

      await generate()

      assert.strictEqual(certOnDisk(), notOurs.cert, 'expired or not, it belongs to the app rather than to roosevelt')
    })
  })

  // roosevelt hands the job to mkcert when the developer has it, because a certificate the machine actually trusts is the one thing roosevelt cannot produce on its own
  //
  // these run against a stand-in rather than the real binary, so they cover roosevelt's side of the arrangement: that it finds it, prefers it, and moves an app onto it. whether mkcert's authority is genuinely trusted by chrome and firefox is mkcert's business and cannot be asserted from here
  describe('handing off to mkcert when it is installed', { skip: noMkcertStub }, () => {
    const { X509Certificate } = require('crypto')
    const caRoot = path.join(appDir, 'mkcertCA')
    const rooseveltCaPath = path.join(appDir, 'ca')

    // replaces the "not found" shim the outer fixture puts down with one that behaves like mkcert
    function installStub () {
      fs.copySync(path.join(__dirname, 'util/mkcertStub.js'), path.join(binDir, 'mkcert'), { overwrite: true })
      fs.chmodSync(path.join(binDir, 'mkcert'), 0o755)
      process.env.MKCERT_STUB_CAROOT = caRoot
    }

    beforeEach(() => {
      delete process.env.MKCERT_STUB_CAROOT
    })

    after(() => {
      delete process.env.MKCERT_STUB_CAROOT
    })

    const generate = async () => certsGenerator(secretsPath, { cert: 'cert.pem', key: 'key.pem' }, rooseveltCaPath)
    const certOnDisk = () => fs.readFileSync(path.join(secretsPath, 'cert.pem'))

    it('should sign with its own authority when mkcert is not on the path', async () => {
      const result = await generate()

      assert.strictEqual(result.signer, 'roosevelt')
      assert.match(new X509Certificate(certOnDisk()).issuer, /Roosevelt Development CA/)
    })

    it('should sign with mkcert when it is on the path', async () => {
      installStub()

      const result = await generate()

      assert.strictEqual(result.signer, 'mkcert')
      assert.match(new X509Certificate(certOnDisk()).issuer, /mkcert/, 'mkcert should have been the one to sign it')
      assert.ok(new X509Certificate(certOnDisk()).verify(new X509Certificate(fs.readFileSync(path.join(caRoot, 'rootCA.pem'))).publicKey), 'and it should verify against mkcert\'s authority')
    })

    it('should still cover localhost and 127.0.0.1', async () => {
      installStub()

      await generate()

      const { subjectAltName } = new X509Certificate(certOnDisk())
      assert.ok(subjectAltName.includes('DNS:localhost'), `got: ${subjectAltName}`)
      assert.ok(subjectAltName.includes('IP Address:127.0.0.1'), `got: ${subjectAltName}`)
    })

    it('should move an app onto mkcert once it is installed', async () => {
      // the certificate roosevelt signed cannot be verified against mkcert's authority, which is the same reasoning that replaces one whose authority has gone: it is no longer something that can be relied on
      await generate()
      const beforeMkcert = certOnDisk().toString()
      assert.match(new X509Certificate(beforeMkcert).issuer, /Roosevelt Development CA/)

      installStub()
      await generate()

      assert.notStrictEqual(certOnDisk().toString(), beforeMkcert)
      assert.match(new X509Certificate(certOnDisk()).issuer, /mkcert/)
    })

    it('should leave an mkcert certificate alone while it is still current', async () => {
      installStub()
      await generate()
      const first = certOnDisk().toString()

      await generate()

      assert.strictEqual(certOnDisk().toString(), first, 'there was nothing wrong with it, so it should not have been rewritten')
    })

    it('should report where mkcert keeps its authority, so the docs can point at it', async () => {
      installStub()

      const result = await generate()

      assert.strictEqual(result.caCertPath, path.join(caRoot, 'rootCA.pem'))
    })
  })
})
