const { describe, it, beforeEach, after } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const captureLogs = require('./util/captureLogs')
const { linkBins, syncCommand } = require('../devSync')

describe('dev sync', () => {
  // linkBins tells whoever is running dev sync what it did, which is noise here: every assertion reads its return value instead
  function link (dir) {
    captureLogs.start()
    try {
      return linkBins(dir)
    } finally {
      captureLogs.stop()
    }
  }

  const appDir = path.join(__dirname, 'app/devSync')
  const binDir = path.join(appDir, 'node_modules', '.bin')
  const roosevelt = path.join(appDir, 'node_modules', 'roosevelt')

  // stands in for an app that has just been synced, carrying only the parts linkBins reads
  function fakeSyncedApp (bin) {
    fs.outputJsonSync(path.join(roosevelt, 'package.json'), { name: 'roosevelt', bin })
    for (const target of Object.values(bin)) fs.outputFileSync(path.join(roosevelt, target), '#!/usr/bin/env node\n')
    fs.ensureDirSync(binDir)
  }

  const bins = {
    'roosevelt-generate-certs': 'lib/scripts/certsGenerator.js',
    'roosevelt-migrate-config': 'lib/scripts/migrateConfig.js'
  }

  const onWindows = process.platform === 'win32'

  // a command is one symlink on posix and a set of shims on windows, so the tests below ask about commands and let this work out the filenames
  function filesFor (...names) {
    return names.flatMap(name => onWindows ? [name, `${name}.cmd`, `${name}.ps1`] : [name])
  }

  // what an entry points at, however it was written: the extensionless one names its target the same way in both cases
  function targetOf (name) {
    const entry = path.join(binDir, name)
    return onWindows ? fs.readFileSync(entry, 'utf8') : fs.readlinkSync(entry)
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  describe('linking the commands roosevelt ships', () => {
    it('should point each one at the script through a relative path', () => {
      fakeSyncedApp(bins)

      const written = link(appDir)

      assert.deepStrictEqual(written.sort(), filesFor(...Object.keys(bins)).sort())
      // an absolute path would break the moment the app moved, and npm writes a relative one too
      assert.ok(targetOf('roosevelt-migrate-config').includes('../roosevelt/lib/scripts/migrateConfig.js'), `should point at the script relatively, got: ${targetOf('roosevelt-migrate-config')}`)
    })

    it('should read the bin list from the synced copy rather than from roosevelt itself', () => {
      // the app has whatever was last copied into it, which is the thing the links have to describe
      fakeSyncedApp({ 'roosevelt-only-in-the-app': 'lib/scripts/madeUp.js' })

      assert.deepStrictEqual(link(appDir).sort(), filesFor('roosevelt-only-in-the-app').sort())
    })

    it('should do nothing on a second run', () => {
      fakeSyncedApp(bins)
      link(appDir)

      // a sync runs on every file change, so relinking every time would churn the filesystem for no reason
      assert.deepStrictEqual(link(appDir), [])
    })

    it('should add one that is missing without touching the others', () => {
      fakeSyncedApp(bins)
      link(appDir)
      fs.rmSync(path.join(binDir, 'roosevelt-migrate-config'))

      // each command is checked on its own, so a partly linked app gets topped up rather than skipped or redone
      assert.deepStrictEqual(link(appDir), ['roosevelt-migrate-config'])
      assert.ok(fs.existsSync(path.join(binDir, 'roosevelt-generate-certs')), 'the one that was already there should still be there')
    })

    it('should correct one that points somewhere else', () => {
      fakeSyncedApp(bins)
      link(appDir)
      const linkPath = path.join(binDir, 'roosevelt-migrate-config')
      fs.rmSync(linkPath)

      // pointing it somewhere else means a different symlink on posix and different shim contents on windows
      if (onWindows) fs.writeFileSync(linkPath, '#!/bin/sh\nnode "$(dirname "$0")/../somewhere/stale.js" "$@"\n')
      else fs.symlinkSync('../somewhere/stale.js', linkPath)

      assert.deepStrictEqual(link(appDir), ['roosevelt-migrate-config'])
      assert.ok(targetOf('roosevelt-migrate-config').includes('../roosevelt/lib/scripts/migrateConfig.js'), `should be corrected, got: ${targetOf('roosevelt-migrate-config')}`)
    })

    it('should leave the app alone when there is nothing to read', () => {
      // an app that was never synced has no roosevelt package.json to describe, and guessing would be worse than doing nothing
      assert.deepStrictEqual(link(appDir), [])
      assert.strictEqual(fs.existsSync(binDir), false)
    })
  })

  describe('building the copy command', () => {
    const args = { srcDir: '/src', destDir: '/dest', ignoredDirectories: ['.build', 'has space'], ignoredFiles: ['notes.txt'] }

    it('should give each exclusion its own flag', () => {
      const command = syncCommand({ ...args, isWindows: false })

      // --exclude={a,b} is brace expansion, which only bash does: node runs these through sh, where the braces pass through literally and nothing is excluded at all
      assert.ok(!command.includes('{'), `no brace expansion, got: ${command}`)
      assert.ok(command.includes("--exclude='.build'"), 'each directory gets its own flag')
      assert.ok(command.includes("--exclude='notes.txt'"), 'and so does each file')
    })

    it('should keep express out of the copy', () => {
      // express is a peer dependency the app supplies, so copying roosevelt's own would shadow it and hide anything that only breaks on the app's version
      assert.ok(syncCommand({ ...args, isWindows: false }).includes("--exclude='/node_modules/express'"))
      assert.ok(syncCommand({ ...args, isWindows: true }).includes(path.join('/src', 'node_modules', 'express')))
    })

    it('should quote the paths it passes', () => {
      // a path containing a space is read as several arguments otherwise, which is common on windows where user folders are named after a person
      assert.ok(syncCommand({ ...args, isWindows: false }).includes("'/src/'"), 'the source is quoted')
      assert.ok(syncCommand({ ...args, isWindows: true }).includes('"has space"'), 'and so is an exclusion containing a space')
    })

    it('should copy into the roosevelt folder inside the app rather than over the app', () => {
      for (const isWindows of [false, true]) {
        const command = syncCommand({ ...args, isWindows })
        assert.ok(/dest[\\/]node_modules[\\/]roosevelt/.test(command), `${isWindows ? 'windows' : 'posix'} should target node_modules/roosevelt, got: ${command}`)
      }
    })
  })
})
