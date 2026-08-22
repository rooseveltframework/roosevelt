const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('public folder', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/publicFolder')
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

  it('should allow for a custom favicon and GET that favicon on request', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'statics/images/faviconTest.ico'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30116 },
        appDir,
        expressSession: false,
        favicon: 'images/faviconTest.ico',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/favicon.ico`)
        if (res.status === 200 && !res.data.includes('404 Not Found')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should allow for no favicon with a null paramter', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30117 },
        appDir,
        expressSession: false,
        favicon: null,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/favicon.ico`)
      } catch (err) {
        if (err.status === 404 && err.response.data.includes('404 Not Found')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should allow the user to set favicon to a wrong or non-existent path and have no favicon show up', (t, done) => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30118 },
        appDir,
        expressSession: false,
        favicon: 'images/nothingHere.ico',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/favicon.ico`)
      } catch (err) {
        if (err.status === 404 && err.response.data.includes('404 Not Found')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should set the name of folder inside of public to the version inside of package.json', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.writeFileSync(path.join(appDir, 'package.json'), '{ "version": "0.5.1", "rooseveltConfig": {} }')
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30119 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        versionedPublic: true,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(() => {
        // the folder itself is the thing being tested, and looking at it avoids depending on how a path is spelled in a log message, which differs between windows and everywhere else
        pass = fs.existsSync(path.join(appDir, 'public', '0.5.1'))
        if (pass) done()
        else done(new Error('Versioned public folder not created'))
      })
    })()
  })
})
