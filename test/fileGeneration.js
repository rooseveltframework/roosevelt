/* eslint-env mocha */

const appCleaner = require('./util/appCleaner')
const assert = require('assert')
const fs = require('fs-extra')
const fsr = require('../lib/tools/fsr')()
const klawSync = require('klaw-sync')
const path = require('path')

describe('file creation', () => {
  const appDir = path.join(__dirname, 'app/dirStructure')

  afterEach(async () => {
    // wipe out test app
    await appCleaner('dirStructure')
  })

  it('should generate several directories at runtime', done => {
    fs.ensureDirSync(appDir)

    // spin up an app configured to make lots of folders
    const app = require('../roosevelt')({
      appDir,
      makeBuildArtifacts: true,
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false,
          verbose: false
        }
      },
      viewsPath: 'mvc/views',
      modelsPath: 'mvc/models',
      controllersPath: 'mvc/controllers',
      staticsRoot: 'statics',
      publicFolder: 'public',
      css: {
        sourcePath: 'css',
        compiler: {
          enable: true,
          module: 'less'
        }
      }
    })

    app.initServer(() => {
      // check that each configured directory exists
      assert(fs.lstatSync(path.join(appDir, 'mvc/views')).isDirectory(), 'viewsPath was not properly generated')
      assert(fs.lstatSync(path.join(appDir, 'mvc/models')).isDirectory(), 'modelsPath was not properly generated')
      assert(fs.lstatSync(path.join(appDir, 'mvc/controllers')).isDirectory(), 'controllersPath was not properly generated')
      assert(fs.lstatSync(path.join(appDir, 'public/css')).isDirectory(), 'css output was not properly generated')
      assert(fs.lstatSync(path.join(appDir, 'statics/css')).isDirectory(), 'css sourcePath was not properly generated')

      done()
    })
  })

  it('should not generate any files when makeBuildArtifacts is false', done => {
    fs.ensureDirSync(appDir)

    // spin up an app
    const app = require('../roosevelt')({
      appDir,
      makeBuildArtifacts: false,
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false,
          verbose: false
        }
      },
      css: {
        sourcePath: 'css',
        compiler: {
          enable: true,
          module: 'less'
        }
      }
    })

    app.initServer(() => {
      // check that the app directory is empty
      assert.deepStrictEqual(klawSync(appDir).length, 0, 'Files were improperly generated')

      done()
    })
  })

  it('should generate a variety of symlinks', done => {
    // generate app directory
    fs.ensureDirSync(appDir)

    // generate package.json to set app version
    fs.outputJsonSync(path.join(appDir, 'package.json'), { version: '0.2.1' })

    // generate stuff to symlink
    fs.ensureDirSync(path.join(appDir, 'images'))
    fs.ensureDirSync(path.join(appDir, 'safeDir'))
    fs.outputJsonSync(path.join(appDir, 'goodies/safeFile.json'), { shouldBe: 'safe' })
    fs.outputJsonSync(path.join(appDir, 'something.json'), { hello: 'world' })

    // spin up an app
    const app = require('../roosevelt')({
      appDir,
      makeBuildArtifacts: true,
      versionedPublic: true,
      logging: {
        methods: {
          info: false,
          warn: false,
          error: false,
          verbose: false
        }
      },
      symlinks: [
        {
          source: 'images',
          dest: '${staticsRoot}/images' // eslint-disable-line
        },
        {
          source: 'images',
          dest: '${publicFolder}/images' // eslint-disable-line
        },
        {
          source: 'mvc',
          dest: 'safeDir'
        },
        {
          source: 'something.json',
          dest: 'extras/something.json'
        },
        {
          source: 'something.json',
          dest: 'goodies/safeFile.json'
        },
        {
          source: 'nothing.json',
          dest: 'goodies/nothing.json'
        }
      ]
    })

    app.initServer(() => {
      // check that only the expected symlinks were generated
      assert(fs.lstatSync(path.join(appDir, 'statics/images')).isSymbolicLink(), 'Directory symlink not generated')
      assert(fs.lstatSync(path.join(appDir, 'public/0.2.1/images')).isSymbolicLink(), 'Directory symlink not generated in versioned public folder')
      assert(fs.lstatSync(path.join(appDir, 'extras/something.json')).isSymbolicLink(), 'File symlink not generated')
      assert(!fs.lstatSync(path.join(appDir, 'safeDir')).isSymbolicLink(), 'Symlink overwrote pre-existing directory')
      assert.deepStrictEqual(require(path.join(appDir, 'goodies/safeFile.json')), { shouldBe: 'safe' }, 'Symlink overwrote pre-existing file')
      assert(!fsr.fileExists(path.join(appDir, 'goodies/nothing.json')), 'Symlink generated pointing to a source that doesn\'t exist')

      done()
    })
  })
})
