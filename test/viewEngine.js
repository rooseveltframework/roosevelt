const { describe, it, beforeEach, afterEach } = require('node:test')
const captureLogs = require('./util/captureLogs')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('view engines', () => {
  // global vars the tests will need
  const context = {}
  const appDir = path.join(__dirname, 'app/viewEngine')
  beforeEach((t, done) => {
    captureLogs.start()
    done()
  })

  // hands the test what the app has logged so far; collecting keeps running until the test ends, so anything logged afterwards is not printed
  function finish (cb) {
    cb(captureLogs.peek())
  }

  // quit the roosevelt app if it hasn't killed itself already and delete the test app
  afterEach(async () => {
    const server = context.app?.get('httpServer')
    if (server?.listening) {
      await new Promise(resolve => {
        server.close(resolve)
        server.closeAllConnections?.()
      })
    }
    context.app = undefined
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should render the teddy test page', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30134 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: [
          'html: teddy'
        ],
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/teddyTest`)
        if (res.status === 200 && res.data.includes('Teddy Test')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should be able to set the viewEngine if it was just a string', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30135 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: 'html: teddy',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/teddyTest`)
        if (res.status === 200 && res.data.includes('Teddy Test')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should make the first of several view engines the default one', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30136 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: [
          'html: teddy',
          'jcs: ../test/util/jcsTemplate'
        ],
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(capturedLogs => {
        if (context.app.get('view engine') === 'html') pass = true
        else pass = false
        if (pass) done()
        else done(new Error('view engine not set correctly'))
      })
    })()
  })

  it('should render the jcs test page with a view engine from a file path', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30137 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: [
          'jcs: ../test/util/jcsTemplate'
        ],
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/jcsTest`)
        if (res.status === 200 && res.data.includes('jcs Test')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should log an error if the viewEngine parameter is formatted incorrectly', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30138 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: [
          'html: teddy: blah'
        ],
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(capturedLogs => {
        if (capturedLogs.includes('Roosevelt Express fatal error: viewEngine param must be formatted as "fileExtension: nodeModule"')) pass = true
        else pass = false
        if (pass) done()
        else done(new Error('view engine not set correctly'))
      })
    })()
  })

  it('should log an error if the viewEngine parameter names a module that cannot be loaded', (t, done) => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        logging: { methods: { http: false } }, // morgan writes straight to the console rather than through roosevelt's logger, so it cannot be collected and would print during the run
        http: { port: 30139 },
        appDir,
        expressSession: false,
        makeBuildArtifacts: true,
        viewEngine: [
          'html: teddyza'
        ],
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(capturedLogs => {
        if (capturedLogs.includes('Failed to register viewEngine')) pass = true
        else pass = false
        if (pass) done()
        else done(new Error('view engine not set correctly'))
      })
    })()
  })
})
