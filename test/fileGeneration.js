/* eslint-env mocha */
/* eslint no-template-curly-in-string: 0 */

const assert = require('assert')
const fs = require('fs-extra')
const { walk } = require('@nodelib/fs.walk/promises')
const path = require('path')

describe('file creation', () => {
  const appDir = path.join(__dirname, 'app/dirStructure')

  afterEach(async () => {
    // wipe out test app
    fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true })
  })

  it('should generate several directories at runtime', async () => {
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
      csrfProtection: false,
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

    await app.initServer()

    // check that each configured directory exists
    assert(fs.lstatSync(path.join(appDir, 'mvc/views')).isDirectory(), 'viewsPath was not properly generated')
    assert(fs.lstatSync(path.join(appDir, 'mvc/models')).isDirectory(), 'modelsPath was not properly generated')
    assert(fs.lstatSync(path.join(appDir, 'mvc/controllers')).isDirectory(), 'controllersPath was not properly generated')
    assert(fs.lstatSync(path.join(appDir, 'public/css')).isDirectory(), 'css output was not properly generated')
    assert(fs.lstatSync(path.join(appDir, 'statics/css')).isDirectory(), 'css sourcePath was not properly generated')
  })

  it('should not generate any files when makeBuildArtifacts is false', async () => {
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
      expressSession: false,
      csrfProtection: false,
      secretsPath: './test/app/secrets',
      css: {
        sourcePath: 'css',
        compiler: {
          enable: true,
          module: 'less'
        }
      }
    })

    await app.initServer()

    // check that the app directory is empty
    assert.deepStrictEqual((await walk(appDir)).length, 0, 'Files were improperly generated')
  })

  it('should generate a variety of symlinks', async () => {
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
      expressSession: false,
      csrfProtection: false,
      secretsPath: './test/app/secrets',
      symlinks: [
        {
          source: 'images',
          dest: '${staticsRoot}/images'
        },
        {
          source: 'images',
          dest: '${publicFolder}/images'
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

    await app.initServer()

    // check that only the expected symlinks were generated
    assert(fs.lstatSync(path.join(appDir, 'statics/images')).isSymbolicLink(), 'Directory symlink not generated')
    assert(fs.lstatSync(path.join(appDir, 'public/0.2.1/images')).isSymbolicLink(), 'Directory symlink not generated in versioned public folder')

    if (process.platform === 'win32') assert(fs.pathExistsSync(path.join(appDir, 'extras/something.json')))
    else assert(fs.lstatSync(path.join(appDir, 'extras/something.json')).isSymbolicLink(), 'File symlink not generated')

    assert(!fs.lstatSync(path.join(appDir, 'safeDir')).isSymbolicLink(), 'Symlink overwrote pre-existing directory')
    assert.deepStrictEqual(require(path.join(appDir, 'goodies/safeFile.json')), { shouldBe: 'safe' }, 'Symlink overwrote pre-existing file')
    assert(!fs.pathExistsSync(path.join(appDir, 'goodies/nothing.json')), 'Symlink generated pointing to a source that doesn\'t exist')
  })
})
