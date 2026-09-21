const { describe, it, before, after } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const selfsigned = require('selfsigned')
const { execFileSync } = require('child_process')

// this installs a certificate authority into the trust store of the machine it runs on, which is not something to do to a developer's laptop because they ran the test suite
//
// so it is off unless asked for, and CI asks for it: the rest of the suite can only ever observe an untrusted answer, which is also what a platform whose trust store roosevelt cannot read would produce, so without this a green CI run on macOS or windows says nothing about whether the check works there
const enabled = process.env.ROOSEVELT_TEST_OS_TRUST_STORE === '1'

// macos will not change trust settings without asking the security server for authorization, and that question has nowhere to go on a headless runner, so `security add-trusted-cert` sits there until the job is killed rather than failing
//
// reading the trust store is verified on macos either way, by the test in mkcertNotice.js that takes a certificate back out of it; what is skipped here is only the half that has to put one in
function why () {
  if (!enabled) return 'set ROOSEVELT_TEST_OS_TRUST_STORE=1 to run this; it installs a certificate authority into this machine\'s trust store'
  if (process.platform === 'darwin') return 'macos cannot install a trusted certificate without an authorization prompt that a headless runner cannot answer'
  return false
}

describe('operating system trust store', { skip: why() }, () => {
  const commonName = 'Roosevelt CI Trust Store Probe'
  const workDir = path.join(os.tmpdir(), 'roosevelt-trust-store-probe')
  const caFile = path.join(workDir, 'probeCA.pem')
  const linuxStorePath = '/usr/local/share/ca-certificates/roosevelt-ci-probe.crt'
  let installed = false

  // stdin is closed rather than piped, so anything that decides to ask a question gets an immediate end of input and fails instead of waiting for an answer nobody is there to give
  //
  // the timeout is the backstop for the rest: a test that cannot install a certificate should say so, and a CI job that hangs burns a runner until someone notices rather than reporting anything at all
  function run (command, args) {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 })
  }

  function installIntoTrustStore () {
    if (process.platform === 'win32') return run('certutil', ['-addstore', '-f', 'Root', caFile])
    if (process.platform === 'darwin') return run('sudo', ['security', 'add-trusted-cert', '-d', '-r', 'trustRoot', '-k', '/Library/Keychains/System.keychain', caFile])
    run('sudo', ['cp', caFile, linuxStorePath])
    run('sudo', ['update-ca-certificates'])
  }

  function removeFromTrustStore () {
    if (process.platform === 'win32') return run('certutil', ['-delstore', 'Root', commonName])
    if (process.platform === 'darwin') return run('sudo', ['security', 'remove-trusted-cert', '-d', caFile])
    run('sudo', ['rm', '-f', linuxStorePath])
    run('sudo', ['update-ca-certificates', '--fresh'])
  }

  // node reads the system trust store once and keeps that list for the life of the process, so asking in this one would answer from before the authority was installed
  function trustedInAFreshProcess () {
    const tool = path.join(__dirname, '../lib/tools/certTrust.js')
    const script = `process.stdout.write(String(require(${JSON.stringify(tool)}).isTrustedByOS(${JSON.stringify(caFile)})))`
    return run(process.execPath, ['-e', script]).trim()
  }

  before(async () => {
    fs.ensureDirSync(workDir)
    const ca = await selfsigned.generate([{ name: 'commonName', value: commonName }], {
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', keyCertSign: true, cRLSign: true }
      ]
    })
    fs.outputFileSync(caFile, ca.cert)
  })

  after(() => {
    if (installed) {
      try {
        removeFromTrustStore()
      } catch (error) {
        // saying so rather than swallowing it, because an authority left behind in a trust store is worth knowing about even on a throwaway CI machine
        process.emitWarning(`could not remove the probe authority from the trust store: ${error.message}`)
      }
    }
    fs.rmSync(workDir, { recursive: true, force: true })
  })

  it('should not see an authority nobody installed', () => {
    assert.strictEqual(trustedInAFreshProcess(), 'false', 'a freshly generated authority should not already be trusted')
  })

  it('should see an authority this machine has been told to trust', () => {
    try {
      installIntoTrustStore()
      installed = true
    } catch (error) {
      assert.fail(`could not install a certificate authority into the ${process.platform} trust store, which this test needs administrator rights to do: ${error.message}`)
    }

    assert.strictEqual(trustedInAFreshProcess(), 'true', `roosevelt did not see an authority that was just installed into the ${process.platform} trust store, so the warning about untrusted certificates would fire for everyone on this platform no matter what they did`)
  })
})
