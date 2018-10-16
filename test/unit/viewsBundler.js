/* eslint-env mocha */

const assert = require('assert')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fsr = require('../../lib/tools/fsr')()
const { fork } = require('child_process')
const fse = require('fs-extra')
const path = require('path')
const klawsync = require('klaw-sync')
const htmlMinifier = require('html-minifier').minify

let minifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  remoaveAttributeQuotes: true,
  removeEmptyAttributes: true
}

describe('Views Bundler Tests', function () {
  const appDir = path.join(__dirname, '../app/viewsBundler')

  const template1 = `
    <h1>Hello World</h1>
    <div>
        <p>lorem ipsum dolor set</p>
    </div>
  `

  let pathOfTemplates = [
    path.join(appDir, 'mvc/views/a.html')
  ]

  let pathOfExposedTemplates = [
    path.join(appDir, 'statics/.build/templates/output.js')
  ]

  let staticTemplates = [
    template1
  ]

  let options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function () {
    fse.ensureDirSync(path.join(appDir, 'mvc/views'))

    for (let i = 0; i < pathOfTemplates.length; i++) {
      fse.writeFileSync(pathOfTemplates[i], staticTemplates[i])
    }
  })

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('properly expose template files in a whitelist', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        let exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          let test = pathOfExposedTemplates.includes(file.path)
          assert.strictEqual(test, true)
        })

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('If a template doesn\'t have an extension, it will add .html to it', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['a']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        let exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          let test = pathOfExposedTemplates.includes(file.path)
          assert.strictEqual(test, true)
        })

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not create a templates folder if there are no items in the whitelist', function (done) {
    generateTestApp({
      appDir,
      clientViews: {},
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        try {
          klawsync(pathToExposedTemplatesFolder)
        } catch (err) {
          assert.strictEqual(err.message.includes('no such file or directory'), true)
        }

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not create a templates folder if generateFolderStructure is false', function (done) {
    generateTestApp({
      appDir,
      clientViews: {},
      generateFolderStructure: false
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        try {
          klawsync(pathToExposedTemplatesFolder)
        } catch (err) {
          assert.strictEqual(err.message.includes('no such file or directory'), true)
        }

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not create a templates folder if there is bundles without any contents', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': []
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        try {
          klawsync(pathToExposedTemplatesFolder)
        } catch (err) {
          assert.strictEqual(err.message.includes('no such file or directory'), true)
        }

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not create a templates folder if there is a bundle that is null', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': null
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        try {
          klawsync(pathToExposedTemplatesFolder)
        } catch (err) {
          assert.strictEqual(err.message.includes('no such file or directory'), true)
        }

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should send an error to the console with an nonexistent template', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['fake.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stderr.on('data', (result) => {
      if (result.includes('no such file or directory')) {
        assert.strictEqual(result.includes('fake.html'), true)
      }

      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should save a file to a specific location when the output folder option is modified', function (done) {
    let customPathArray = [
      path.join(appDir, 'statics/js/output.js')
    ]

    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['a.html']
        },
        output: 'js'
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/js')

        let exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          let test = customPathArray.includes(file.path)
          assert.strictEqual(test, true)
        })

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should minify a template when the minify param is enabled', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        let exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          let templateJSON = require(file.path)()

          for (let key in templateJSON) {
            let template = templateJSON[key]
            assert.strictEqual(htmlMinifier(template), template)
          }
        })

        testApp.send('stop')
      }
    })

    testApp.stderr.on('data', (result) => {
      console.error(result.toString())
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not minify templates when it the param is disabled', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        bundles: {
          'output.js': ['a.html']
        },
        minify: false
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        let exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          let templateJSON = require(file.path)()

          for (let key in templateJSON) {
            const template = templateJSON[key]
            assert.notStrictEqual(htmlMinifier(template, minifyOptions), template)
          }
        })

        testApp.send('stop')
      }
    })

    testApp.stderr.on('data', (result) => {
      console.error(result.toString())
    })

    testApp.on('exit', () => {
      done()
    })
  })
})

function serverStarted (result) {
  return result.toString().includes('Roosevelt Express HTTP server listening')
}
