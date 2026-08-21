// packs roosevelt the way npm would publish it, installs it into a throwaway app, and checks that the result actually works
// this is separate from the main test suite because it hits the network and takes about a minute, but it catches a class of problem the suite structurally cannot:
// the suite runs against this repo, where every dependency is already present, so it can never notice a file missing from the published package or a peer dependency that the app has to supply for itself
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const workDir = path.join(os.tmpdir(), 'roosevelt-package-smoke-test')
const appDir = path.join(workDir, 'app')
const repoDir = path.join(__dirname, '../..')

let failures = 0

function check (description, passed, detail) {
  if (passed) console.log(`  ✅ ${description}`)
  else {
    failures++
    console.log(`  ❌ ${description}`)
    if (detail) console.log(`     ${detail}`)
  }
}

// npm is npm.cmd on windows, and execFileSync does not find it without the shell
function npm (args, cwd) {
  return execFileSync('npm', args, { cwd, encoding: 'utf8', shell: true, stdio: 'pipe' })
}

// starts the throwaway app and hands back everything it printed, so the checks can look for specific messages
// both streams are captured because roosevelt logs warnings and errors to stderr, and those are most of what is worth asserting on here
function startApp () {
  const result = spawnSync(process.execPath, ['app.js'], { cwd: appDir, encoding: 'utf8' })
  const output = `${result.stdout || ''}${result.stderr || ''}`
  return result.status === 0 ? output : `${output}FAILED TO START: exit code ${result.status}`
}

try {
  fs.rmSync(workDir, { recursive: true, force: true })
  fs.ensureDirSync(appDir)

  console.log('\npacking roosevelt as npm would publish it')
  npm(['pack', '--pack-destination', workDir], repoDir)
  const tarball = fs.readdirSync(workDir).find(file => file.endsWith('.tgz'))
  check('npm pack produced a tarball', !!tarball)
  if (!tarball) throw new Error('nothing to test without a tarball')

  const contents = execFileSync('tar', ['tzf', path.join(workDir, tarball)], { encoding: 'utf8' }).split('\n')
  check('the tarball ships roosevelt.js', contents.includes('package/roosevelt.js'))
  check('the tarball ships lib', contents.some(entry => entry.startsWith('package/lib/')))
  check('the tarball ships lib/tools', contents.some(entry => entry.startsWith('package/lib/tools/')))
  check('the tarball ships defaultErrorPages', contents.some(entry => entry.startsWith('package/defaultErrorPages/')))
  check('the tarball ships config.js', contents.includes('package/config.js'))
  check('the tarball does not ship node_modules', !contents.some(entry => entry.startsWith('package/node_modules/')))
  check('the tarball does not ship the test suite', !contents.some(entry => entry.startsWith('package/test/')))

  console.log('\ninstalling it into a throwaway app')
  npm(['init', '-y'], appDir)
  npm(['i', path.join(workDir, tarball)], appDir)
  fs.writeFileSync(path.join(appDir, 'app.js'), `(async () => {
  await require('roosevelt')({
    mode: 'development',
    makeBuildArtifacts: false,
    frontendReload: { enable: false },
    http: { enable: false },
    https: { enable: false }
  }).initServer()
})()
`)
  check('roosevelt installed as a real copy rather than a symlink', !fs.lstatSync(path.join(appDir, 'node_modules', 'roosevelt')).isSymbolicLink())

  console.log('\nwithout express declared as a dependency')
  const undeclared = startApp()
  check('the app still starts', !undeclared.includes('FAILED TO START'), undeclared.slice(0, 300))
  check('roosevelt says to add express to the dependencies', undeclared.includes('add `express` to your dependencies'), undeclared.slice(0, 300))

  console.log('\nwith express declared')
  npm(['i', 'express'], appDir)
  const declared = startApp()
  check('the app starts', !declared.includes('FAILED TO START'), declared.slice(0, 300))
  check('roosevelt no longer asks for express', !declared.includes('add `express` to your dependencies'), declared.slice(0, 300))

  console.log('\nthe config helper apps import to write a config file')
  // this is checked from a real install because `require('roosevelt/config')` resolves by file path, so dropping config.js from the files list would break every app's config with nothing in the suite noticing
  // the ref has to be read back rather than merely constructed: sourceParams requires config files inside a try/catch, so a config that failed to load would be dropped in silence and the app would run on defaults
  // both params default to false and nothing in param sourcing rewrites either one, so a true can only have come from this file
  fs.writeFileSync(path.join(appDir, 'rooseveltConfig.js'), `const rooseveltConfig = require('roosevelt/config')
module.exports = {
  versionedPublic: true,
  localhostOnly: rooseveltConfig.ref(param => param.versionedPublic)
}
`)
  fs.writeFileSync(path.join(appDir, 'configProbe.js'), `const params = require('roosevelt')({ mode: 'development' }).expressApp.get('params')
console.log('PROBE ' + JSON.stringify(params.versionedPublic) + ' ' + JSON.stringify(params.localhostOnly))
`)
  const probe = spawnSync(process.execPath, ['configProbe.js'], { cwd: appDir, encoding: 'utf8' })
  const probed = `${probe.stdout || ''}${probe.stderr || ''}`
  check('the config file loads, so `roosevelt/config` resolved from the install', probed.includes('PROBE true'), probed.slice(0, 300))
  check('a ref written with the helper resolves against the other params', probed.includes('PROBE true true'), probed.slice(0, 300))
  fs.rmSync(path.join(appDir, 'rooseveltConfig.js'), { force: true })
  fs.rmSync(path.join(appDir, 'configProbe.js'), { force: true })

  console.log('\non the other supported express major')
  npm(['i', 'express@4'], appDir)
  const installedMajor = fs.readJsonSync(path.join(appDir, 'node_modules', 'express', 'package.json')).version.split('.')[0]
  check('express 4 installed', installedMajor === '4', `found express ${installedMajor}`)
  const onExpress4 = startApp()
  check('the app starts on express 4', !onExpress4.includes('FAILED TO START'), onExpress4.slice(0, 300))

  console.log('\nthe commands roosevelt ships')
  // these only work from a real install, because they rely on npm linking them into node_modules/.bin
  const bins = fs.readdirSync(path.join(appDir, 'node_modules', '.bin')).filter(entry => entry.startsWith('roosevelt-'))
  for (const bin of ['roosevelt-generate-certs', 'roosevelt-generate-secrets', 'roosevelt-generate-session-secret', 'roosevelt-migrate-config']) {
    check(`${bin} is installed`, bins.includes(bin))
  }
  const secretRun = spawnSync('npx', ['roosevelt-generate-session-secret'], { cwd: appDir, encoding: 'utf8', shell: true })
  check('roosevelt-generate-session-secret runs and writes a secret', secretRun.status === 0 && fs.pathExistsSync(path.join(appDir, 'secrets', 'sessionSecret.json')), `exit ${secretRun.status}`)

  console.log('\nwith express missing entirely')
  fs.rmSync(path.join(appDir, 'node_modules', 'express'), { recursive: true, force: true })
  const missing = startApp()
  check('the app refuses to start', missing.includes('FAILED TO START'), missing.slice(0, 300))
  check('roosevelt names express as the cause', missing.includes('Roosevelt could not find Express'), missing.slice(0, 300))
} catch (err) {
  failures++
  console.log(`\n  ❌ the smoke test could not finish: ${err.message}`)
} finally {
  fs.rmSync(workDir, { recursive: true, force: true })
}

console.log(failures ? `\n${failures} check(s) failed\n` : '\nall checks passed\n')
process.exit(failures ? 1 : 0)
