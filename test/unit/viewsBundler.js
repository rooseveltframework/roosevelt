/* eslint-env mocha */

const assert = require('assert')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const path = require('path')
const klawsync = require('klaw-sync')

describe('Views Bundler Tests', function () {
  const appDir = path.join(__dirname, '../app/viewsBundler')

  const template1 = `<h1>Hello World</h1>`

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
      clientViewBundles: {
        'output.js': ['a.html']
      }
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
      clientViewBundles: {
        'output.js': ['a']
      }
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
      clientViewBundles: {}
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        assert.throws(klawsync(pathToExposedTemplatesFolder))

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
      clientViewBundles: {
        'output.js': []
      }
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        assert.throws(klawsync(pathToExposedTemplatesFolder))

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
      clientViewBundles: {
        'output.js': null
      }
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        let pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        assert.throws(klawsync(pathToExposedTemplatesFolder))

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
      clientViewBundles: {
        'output.js': ['fake.html']
      }
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
})

function serverStarted (result) {
  return result.toString().includes('Roosevelt Express HTTP server listening')
}
