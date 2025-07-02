/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('method params', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app')

  // capture everything a roosevelt app logs to the console
  let capturedLogs = ''
  beforeEach(done => {
    capturedLogs = ''
    process.stdout.write = (chunk, encoding, callback) => {
      capturedLogs += chunk.toString()
      if (callback) callback()
    }
    process.stderr.write = (chunk, encoding, callback) => {
      capturedLogs += chunk.toString()
      if (callback) callback()
    }
    done()
  })

  // undo capturing everything logged to the console so that mocha can print results
  const originalStdoutWrite = process.stdout.write
  const originalStderrWrite = process.stderr.write
  function finish (cb) {
    process.stdout.write = originalStdoutWrite
    process.stderr.write = originalStderrWrite
    cb(capturedLogs)
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach(done => {
    if (!context?.app?.get) {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    }
    context.app.get('httpServer').close(() => {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    })
  })

  it('should execute what is in onServerInit', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
          pass = true
        }
      })
      await rooseveltApp.initServer()
      finish((capturedLogs) => {
        if (pass) done()
        else done(new Error('onServerInit did not fire'))
      })
    })()
  })

  it('should execute what is in onAppExit', done => {
    (async () => {
      let pass = false
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        onServerInit: app => {
          context.app = app
        },
        onAppExit: () => {
          pass = true
        }
      })
      await rooseveltApp.startServer()
      await rooseveltApp.stopServer()
      process.exit = originalProcessExit
      finish((capturedLogs) => {
        if (pass) done()
        else done(new Error('onAppExit did not fire'))
      })
    })()
  })

  it('should throw an error if there is a controller that is not coded properly', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (capturedLogs.includes('Roosevelt Express failed to load controller file')) pass = true
        if (pass) done()
        else done(new Error('No error thrown'))
      })
    })()
  })

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))
      const rooseveltApp = roosevelt({
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (capturedLogs.includes('Roosevelt Express failed to load controller file')) pass = true
        if (pass) done()
        else done(new Error('No error thrown'))
      })
    })()
  })
})
