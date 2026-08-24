const { describe, it, beforeEach, after } = require('node:test')
const rooseveltConfig = require('../config')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const { execFileSync } = require('child_process')
const roosevelt = require('../roosevelt')

describe('config file', () => {
  const appDir = path.join(__dirname, 'app/configFile')
  const quiet = { logging: { methods: { http: false, info: false, warn: false, error: false } }, csrfProtection: false, expressSession: false }

  // each test gets its own folder, because a config file is loaded with require and would otherwise be served from the module cache
  let run = 0
  function freshDir () {
    run++
    const dir = path.join(appDir, 'run' + run)
    fs.ensureDirSync(dir)
    return dir
  }

  function params (dir, options = {}) {
    return roosevelt({ appDir: dir, ...quiet, ...options }).expressApp.get('params')
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('which files are read', () => {
    it('should read rooseveltConfig.js', () => {
      const dir = freshDir()
      fs.outputFileSync(path.join(dir, 'rooseveltConfig.js'), 'module.exports = { http: { port: 40001 } }')

      assert.strictEqual(params(dir).http.port, 40001)
    })

    it('should read roosevelt.config.js', () => {
      const dir = freshDir()
      fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'module.exports = { http: { port: 40002 } }')

      assert.strictEqual(params(dir).http.port, 40002)
    })

    it('should prefer roosevelt.config.js when both are present', () => {
      // roosevelt.config.js is the name roosevelt writes and documents; rooseveltConfig.js is still read so that apps predating the rename keep working
      const dir = freshDir()
      fs.outputFileSync(path.join(dir, 'rooseveltConfig.js'), 'module.exports = { http: { port: 40003 } }')
      fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'module.exports = { http: { port: 40004 } }')

      assert.strictEqual(params(dir).http.port, 40004)
    })

    it('should no longer read roosevelt.config.json', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'roosevelt.config.json'), { http: { port: 40006 } })

      assert.notStrictEqual(params(dir).http.port, 40006)
    })

    it('should no longer read rooseveltConfig.json', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), { http: { port: 40005 } })

      assert.notStrictEqual(params(dir).http.port, 40005)
    })

    it('should let the constructor win over the config file', () => {
      const dir = freshDir()
      fs.outputFileSync(path.join(dir, 'rooseveltConfig.js'), 'module.exports = { http: { port: 40007 } }')

      assert.strictEqual(params(dir, { http: { port: 40008 } }).http.port, 40008)
    })

    it('should carry on when there is no config file at all', () => {
      assert.ok(params(freshDir()).http.port, 'the defaults should still apply')
    })
  })

  describe('refs', () => {
    it('should resolve against params roosevelt derives rather than what was written in the file', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'x', version: '2.3.4' })

      const p = params(dir, {
        versionedPublic: true,
        symlinks: [{ source: rooseveltConfig.ref(param => param.js.sourcePath), dest: rooseveltConfig.ref(param => path.join(param.publicFolder, 'js')) }]
      })

      assert.strictEqual(p.symlinks[0].source, p.js.sourcePath)
      assert.ok(p.symlinks[0].dest.includes('2.3.4'), 'the ref should see the public folder after versioning was applied')
    })

    it('should keep the type the ref returns', () => {
      const p = params(freshDir(), {
        https: { port: rooseveltConfig.ref(param => param.http.port + 1) },
        hostPublic: rooseveltConfig.ref(() => false)
      })

      assert.strictEqual(typeof p.https.port, 'number', 'a number should not be turned into a string')
      assert.strictEqual(p.hostPublic, false)
    })

    it('should resolve a ref that reads a value another ref produced', () => {
      const p = params(freshDir(), {
        css: { allowlist: [rooseveltConfig.ref(param => path.join(param.staticsRoot, 'a.css'))] },
        // copy is read before css, so this only works because refs are resolved until none are left rather than once in key order
        copy: [{ source: rooseveltConfig.ref(param => param.css.allowlist[0]), dest: 'public/a.css' }]
      })

      assert.strictEqual(p.copy[0].source, p.css.allowlist[0])
      assert.ok(!String(p.copy[0].source).includes('$'), 'the value should be fully resolved')
    })

    it('should say which params are stuck when refs wait on each other', () => {
      assert.throws(() => params(freshDir(), {
        localhostOnly: rooseveltConfig.ref(param => param.hostPublic),
        hostPublic: rooseveltConfig.ref(param => param.localhostOnly)
      }), err => {
        // leaving these in place would hand the app an empty object where it asked for a value, so it has to stop and say so
        assert.ok(err.message.includes('localhostOnly'), 'the message should name the params involved')
        assert.ok(err.message.includes('hostPublic'), 'the message should name both of them')
        return true
      })
    })

    it('should stop on a ref that returns itself forever', () => {
      const loop = rooseveltConfig.ref(() => loop)

      assert.throws(() => params(freshDir(), { localhostOnly: loop }), /could not work out a value/)
    })

    it('should cope with a config object that contains itself', () => {
      const loop = { name: 'loop' }
      loop.self = loop

      // walking this without keeping track of where it had been would follow it round until the stack ran out
      assert.strictEqual(params(freshDir(), { helmet: loop }).helmet.name, 'loop')
    })

    it('should still resolve a long chain of refs', () => {
      const p = params(freshDir(), {
        localhostOnly: rooseveltConfig.ref(param => param.hostPublic),
        hostPublic: rooseveltConfig.ref(param => param.versionedPublic),
        versionedPublic: rooseveltConfig.ref(param => param.minify)
      })

      assert.strictEqual(p.localhostOnly, p.minify, 'a value should travel the whole chain')
    })

    it('should refuse anything that is not a function', () => {
      assert.throws(() => rooseveltConfig.ref('not a function'), /takes a function/)
    })

    it('should leave params that are legitimately functions alone', () => {
      const onServerInit = () => {}

      assert.strictEqual(params(freshDir(), { onServerInit }).onServerInit, onServerInit)
    })
  })

  describe('migration script', () => {
    it('should convert a JSON config into a js config, turning template values into refs', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), {
        http: { port: 40009 },
        symlinks: [{ source: '${staticsRoot}/js', dest: '${publicFolder}/js' }] // eslint-disable-line no-template-curly-in-string
      })

      execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })

      const written = fs.readFileSync(path.join(dir, 'roosevelt.config.js'), 'utf8')

      assert.ok(written.includes("require('roosevelt/config')"), 'the generated file should import the config helper')
      assert.ok(written.includes('rooseveltConfig.ref(param =>'), 'template values should become refs')
      assert.ok(written.includes('port: 40009'), 'plain values should carry over')
    })

    it('should convert a roosevelt.config.json as well as a rooseveltConfig.json', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'roosevelt.config.json'), { http: { port: 40011 } })

      execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })

      assert.ok(fs.readFileSync(path.join(dir, 'roosevelt.config.js'), 'utf8').includes('port: 40011'))
    })

    it('should merge both json config names when an app somehow has both', () => {
      // roosevelt only ever read one of them, with rooseveltConfig.json winning, so that is the precedence the migration keeps
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'roosevelt.config.json'), { versionedPublic: true, http: { port: 333 } })
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), { http: { port: 444 } })

      const output = execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })
      const written = fs.readFileSync(path.join(dir, 'roosevelt.config.js'), 'utf8')

      assert.ok(written.includes('versionedPublic: true'), 'a param set in only one of them should survive')
      assert.ok(written.includes('port: 444'), 'rooseveltConfig.json should win where both set the same param')
      assert.strictEqual(written.includes('port: 333'), false, 'the value that was being overridden should not come through')
      assert.ok(output.includes('roosevelt.config.json') && output.includes('rooseveltConfig.json'), 'both files should be named as sources')
    })

    it('should convert a rooseveltConfig key in package.json', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'x', rooseveltConfig: { http: { port: 40010 } } })

      execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })

      assert.ok(fs.readFileSync(path.join(dir, 'roosevelt.config.js'), 'utf8').includes('port: 40010'))
    })

    it('should merge every place a config lived rather than picking one', () => {
      // roosevelt used to read a package.json key as well as a config file, so params could be spread across both
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'x', rooseveltConfig: { versionedPublic: true, http: { port: 111 } } })
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), { http: { port: 222 } })

      execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })
      const written = fs.readFileSync(path.join(dir, 'roosevelt.config.js'), 'utf8')

      assert.ok(written.includes('versionedPublic: true'), 'a param set only in package.json should survive')
      assert.ok(written.includes('port: 222'), 'the config file should win where both set the same param')
      assert.strictEqual(written.includes('port: 111'), false, 'the value that was being overridden should not come through')
    })

    it('should name every source it migrated so nothing is left behind', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'package.json'), { name: 'x', rooseveltConfig: { versionedPublic: true } })
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), { http: { port: 222 } })

      const output = execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { encoding: 'utf8' })

      assert.ok(output.includes('package.json'), 'the package.json key should be mentioned')
      assert.ok(output.includes('rooseveltConfig.json'), 'the config file should be mentioned')
    })

    it('should refuse to overwrite a js config that already exists', () => {
      const dir = freshDir()
      fs.outputJsonSync(path.join(dir, 'rooseveltConfig.json'), { http: { port: 1 } })
      fs.outputFileSync(path.join(dir, 'roosevelt.config.js'), 'module.exports = {}')

      assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, '../lib/scripts/migrateConfig.js'), dir], { stdio: 'pipe' }))
    })
  })
})
