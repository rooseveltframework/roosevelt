const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('method params', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/paramFunctions')
  beforeEach((t, done) => {
    captureLogs.start()
    done()
  })

  // hands the test what the app has logged so far; collecting keeps running until the test ends, so anything logged afterwards is not printed
  function finish (cb) {
    cb(captureLogs.peek())
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach((t, done) => {
    if (!context?.app?.get) {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    }
    context.app.get('httpServer').close(() => {
      fs.rmSync(appDir, { recursive: true, force: true })
      done()
    })
  })

  it('should execute what is in onServerInit', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
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

  it('should execute what is in onAppExit', (t, done) => {
    (async () => {
      let pass = false
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30113 },
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

  it('should throw an error if there is a controller that is not coded properly', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30114 },
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

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30115 },
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
