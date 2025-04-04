/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('routing', () => {
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

  it('should respond to a route handled in a controller file', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/HTMLTest`)
        if (res.status === 200 && res.data.includes('TitleX')) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should resolve a request to a public file', done => {
    (async () => {
      let pass = false
      fs.ensureFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
      const rooseveltApp = roosevelt({
        appDir,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}${context.app.get('routePrefix')}/text/hello.txt`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should respond to route hosted in a subdirectory via routePrefix', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
        routePrefix: 'foo',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/foo/HTMLTest`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should resolve a request to a public file hosted in a subdirectory via routePrefix', done => {
    (async () => {
      let pass = false
      fs.ensureFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
      const rooseveltApp = roosevelt({
        appDir,
        routePrefix: 'foo',
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}${context.app.get('routePrefix')}/text/hello.txt`)
        if (res.status === 200) pass = true
        else pass = false
      } catch (err) {}
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should be able to start the app normally without any controller errors, even though there is a non-controller file in the controller folder', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copyFileSync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'mvc/controllers/faviconTest.ico'))
      const rooseveltApp = roosevelt({
        appDir,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish(capturedLogs => {
        if (capturedLogs.includes('Roosevelt Express HTTP server listening on port 43763 (production mode)')) pass = true
        else pass = false
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })
})
