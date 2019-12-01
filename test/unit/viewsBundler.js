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

const minifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  remoaveAttributeQuotes: true,
  removeEmptyAttributes: true
}

describe('Views Bundler Tests', function () {
  const appDir = path.join(__dirname, '../app/viewsBundler')

  const template1 = `
    <!-- roosevelt-whitelist output.js -->
    <h1>Hello World</h1>
    <div>
        <p>lorem ipsum dolor set</p>
    </div>
  `
  const template2 = `
    <div>This will be put in bundle.js</div>
  `

  const blacklistedTemplate = `
    <!-- roosevelt-blacklist -->
    <p>This is in a blacklist</p>  
  `

  const pathOfTemplates = [
    path.join(appDir, 'mvc/views/a.html'),
    path.join(appDir, 'mvc/views/b.html'),
    path.join(appDir, 'mvc/views/bad.html')
  ]

  const pathOfExposedTemplates = [
    path.join(appDir, 'statics/.build/templates/output.js')
  ]

  const staticTemplates = [
    template1,
    template2,
    blacklistedTemplate
  ]

  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

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
      // logging: {
      //   params: {
      //     disable: 'DEVELOPMENT'
      //   }
      // },
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    // console.log(process.env)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      console.log(result.toString())
      if (serverStarted(result)) {
        assertFilesExist(appDir, 'statics/.build/templates', pathOfExposedTemplates)

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('If a template doesn\'t have an extension, it will add .html to it', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesExist(appDir, 'statics/.build/templates', pathOfExposedTemplates)
        testApp.send('stop')
      }
    })

    outputStderr(testApp)

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

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesNotCreated(appDir, 'statics/.build/templates')

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

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

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesNotCreated(appDir, 'statics/.build/templates')

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
        whitelist: {
          'output.js': []
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesNotCreated(appDir, 'statics/.build/templates')

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not create a templates folder if there is a bundle that is null', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': null
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesNotCreated(appDir, 'statics/.build/templates')

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should send an error to the console with an nonexistent template', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['fake.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stderr.on('data', (result) => {
      if (result.includes('no such file or directory')) {
        assert.strictEqual(result.includes('fake.html'), true)
      }

      testApp.send('stop')
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should skip a file if it is in the whitelist but has a <!-- roosevelt-blacklist --> tag', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['bad.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesNotCreated(appDir, 'statics/.build/templates')

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should save a file to a specific location when the output folder option is modified', function (done) {
    const customPathArray = [
      path.join(appDir, 'statics/js/output.js')
    ]

    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        },
        output: 'js'
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        assertFilesExist(appDir, 'statics/js', customPathArray)
        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should minify a template when the minify param is enabled', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()

          for (const key in templateJSON) {
            const template = templateJSON[key]
            assert.strictEqual(htmlMinifier(template, minifyOptions), template)
          }
        })

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not minify templates when it the param is disabled', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        },
        minify: false
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()

          for (const key in templateJSON) {
            const template = templateJSON[key]
            assert.notStrictEqual(htmlMinifier(template, minifyOptions), template)
          }
        })

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should accept minify options', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        },
        minifyOptions
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()

          for (const key in templateJSON) {
            const template = templateJSON[key]
            assert.strictEqual(htmlMinifier(template, minifyOptions), template)
          }
        })

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to preprocess templates', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        whitelist: {
          'output.js': ['a.html']
        },
        minifyOptions
      },
      generateFolderStructure: true,
      onClientViewsProcess: '(template) => { return template + "<div>Appended div!</div>" }'
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

        exposedTemplatesArray.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()

          for (const key in templateJSON) {
            const template = templateJSON[key]
            assert.strictEqual(template.endsWith('<div>Appended div!</div>'), true)
          }
        })

        testApp.send('stop')
      }
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to skip exposing files in the exposeAll step when already in whitelist', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true,
        whitelist: {
          'output.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        assert.strictEqual(exposedTemplates.length, 2)

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should save a file that has a whitelist defined both in roosevelt args and the template to the location defined in the template', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true,
        whitelist: {
          'foobar.js': ['a.html']
        }
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        exposedTemplates.forEach(bundle => {
          const bundleName = bundle.path.split(path.sep).pop()

          assert.notStrictEqual(bundleName, 'foobar.js')
        })

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to include a blacklist', function (done) {
    const blacklist = ['bad.html']

    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true,
        blacklist
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        exposedTemplates.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()
          const templates = Object.keys(templateJSON)

          blacklist.forEach(notExposedFile => {
            templates.forEach(template => {
              assert.strictEqual(template.includes(notExposedFile), false)
            })
          })
        })

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should be able to blacklist files with a <!-- roosevelt-blacklist --> tag at the top of the file', function (done) {
    const blacklist = ['bad.html']

    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        exposedTemplates.forEach((file) => {
          if (fsr.fileExists(file.path)) {
            delete require.cache[require.resolve(file.path)]
          }
          const templateJSON = require(file.path)()
          const templates = Object.keys(templateJSON)

          blacklist.forEach(notExposedFile => {
            templates.forEach(template => {
              assert.strictEqual(template.includes(notExposedFile), false)
            })
          })
        })

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should save whitelisted files with a <!-- roosevelt-whitelist --> tag to the proper location', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        const outputBundle = exposedTemplates.filter(exposedTemp => exposedTemp.path.endsWith('output.js'))[0]

        if (fsr.fileExists(outputBundle.path)) {
          delete require.cache[require.resolve(outputBundle.path)]
        }
        const templateJSON = require(outputBundle.path)()
        const templates = Object.keys(templateJSON)

        assert.strictEqual(templates.length, 1)

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })

  it('should save whitelisted files without a <!-- roosevelt-whitelist --> tag to the default location', function (done) {
    generateTestApp({
      appDir,
      clientViews: {
        exposeAll: true
      },
      generateFolderStructure: true
    }, options)

    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (result) => {
      if (serverStarted(result)) {
        const pathToExposedTemplatesFolder = path.join(appDir, 'statics/.build/templates')

        const exposedTemplates = klawsync(pathToExposedTemplatesFolder, { nodir: true })

        const outputBundle = exposedTemplates.filter(exposedTemp => exposedTemp.path.endsWith('bundle.js'))[0]

        if (fsr.fileExists(outputBundle.path)) {
          delete require.cache[require.resolve(outputBundle.path)]
        }
        const templateJSON = require(outputBundle.path)()
        const templates = Object.keys(templateJSON)

        assert.strictEqual(templates.length, 1)

        testApp.send('stop')
      }
    })

    outputStderr(testApp)

    testApp.on('exit', () => {
      done()
    })
  })
})

function serverStarted (result) {
  return result.toString().includes('Roosevelt Express HTTP server listening')
}

function assertFilesNotCreated (appDir, templatePath) {
  const pathToExposedTemplatesFolder = path.join(appDir, templatePath)

  try {
    klawsync(pathToExposedTemplatesFolder)
  } catch (err) {
    assert.strictEqual(err.message.includes('no such file or directory'), true)
  }
}

function assertFilesExist (appDir, templatePath, pathOfExposedTemplates) {
  const pathToExposedTemplatesFolder = path.join(appDir, templatePath)

  const exposedTemplatesArray = klawsync(pathToExposedTemplatesFolder)

  exposedTemplatesArray.forEach((file) => {
    const test = pathOfExposedTemplates.includes(file.path)
    assert.strictEqual(test, true)
  })
}

function outputStderr (testApp) {
  testApp.stderr.on('data', (result) => console.log(result.toString()))
}
