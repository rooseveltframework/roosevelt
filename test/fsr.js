const { describe, it, beforeEach, after } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const fsr = require('../lib/tools/fsr')

describe('file system module', () => {
  const appDir = path.join(__dirname, 'app/fsr')

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(appDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // the CLI commands roosevelt ships call this without an app, since there is no app running when you generate certs or secrets from the command line
  describe('without an app', () => {
    it('should write files', () => {
      const file = path.join(appDir, 'made/by/fsr.txt')

      captureLogs.start()
      try {
        fsr().writeFileSync(file, 'contents')
      } finally {
        captureLogs.stop()
      }

      assert.strictEqual(fs.readFileSync(file, 'utf8'), 'contents')
    })

    it('should make directories', () => {
      const dir = path.join(appDir, 'made/by/fsr')

      captureLogs.start()
      try {
        fsr().ensureDirSync(dir)
      } finally {
        captureLogs.stop()
      }

      assert.ok(fs.pathExistsSync(dir))
    })

    it('should log under a default app name, since there is no app to ask for one', () => {
      captureLogs.start()
      let captured = ''
      try {
        fsr().ensureDirSync(path.join(appDir, 'logged'))
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('Roosevelt Express'), `expected the default app name, got: ${JSON.stringify(captured.slice(0, 200))}`)
    })

    it('should use a supplied log message instead of the default one', () => {
      captureLogs.start()
      let captured = ''
      try {
        fsr().writeFileSync(path.join(appDir, 'custom.txt'), 'x', ['📝', 'a message of my own'])
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('a message of my own'))
      assert.strictEqual(captured.includes('making new file'), false, 'the default message should not also print')
    })
  })

  describe('with an app', () => {
    // a stand in for the roosevelt app, since fsr only ever asks it for these three things
    function fakeApp (makeBuildArtifacts) {
      const logged = []
      const app = {
        get: key => ({
          params: { makeBuildArtifacts },
          logger: { info: (...args) => logged.push(args.join(' ')) },
          appName: 'My App'
        })[key]
      }
      return { app, logged }
    }

    it('should write nothing when makeBuildArtifacts is off', () => {
      const { app } = fakeApp(false)
      const file = path.join(appDir, 'shouldNotExist.txt')

      fsr(app).writeFileSync(file, 'contents')
      fsr(app).ensureDirSync(path.join(appDir, 'shouldNotExistEither'))

      assert.strictEqual(fs.pathExistsSync(file), false)
      assert.strictEqual(fs.pathExistsSync(path.join(appDir, 'shouldNotExistEither')), false)
    })

    it('should log under the app name', () => {
      const { app, logged } = fakeApp(true)

      fsr(app).ensureDirSync(path.join(appDir, 'named'))

      assert.ok(logged.join('\n').includes('My App'))
    })
  })

  describe('listing files', () => {
    it('should find files in nested directories', () => {
      fs.outputFileSync(path.join(appDir, 'a.txt'), '')
      fs.outputFileSync(path.join(appDir, 'deep/b.txt'), '')
      fs.outputFileSync(path.join(appDir, 'deep/deeper/c.txt'), '')

      const found = fsr().getAllFilesRecursivelySync(appDir).map(file => path.relative(appDir, file)).sort()

      assert.deepStrictEqual(found, ['a.txt', path.join('deep', 'b.txt'), path.join('deep', 'deeper', 'c.txt')])
    })

    it('should return nothing for an empty directory', () => {
      assert.deepStrictEqual(fsr().getAllFilesRecursivelySync(appDir), [])
    })
  })
})
