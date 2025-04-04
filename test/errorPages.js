/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('error pages', () => {
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
    if (context.app.get('httpsServer')?.close) {
      let done1 = false
      let done2 = false
      context.app.get('httpServer').close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done1 = true
      })
      context.app.get('httpsServer')?.close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done2 = true
      })
      setTimeout(() => {
        if (done1 && done2) done()
      }, 100)
    } else {
      context.app.get('httpServer').close(() => {
        fs.rmSync(appDir, { recursive: true, force: true })
        done()
      })
    }
  })

  it('should render the default 404 page if there is a request for an invalid route', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
      } catch (err) {
        if (err.status === 404 && !err.response.data.includes('404 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render a custom 404 page if there is a request for an invalid route and the 404 parameter is set', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/404test.js'), path.join(appDir, 'mvc/controllers/404test.js'))
      const rooseveltApp = roosevelt({
        appDir,
        errorPages: {
          notFound: '404test.js'
        },
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/randomURL`)
      } catch (err) {
        if (err.status === 404 && err.response.data.includes('404 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render the default 500 error page if an error has occured on the server', done => {
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
        await axios.get(`http://localhost:${context.app.get('params').http.port}/serverError`)
      } catch (err) {
        if (err.status === 500 && !err.response.data.includes('500 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should render a custom 500 page if there is a request for a route that will respond with a server error and the 500 parameter is set', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/500test.js'), path.join(appDir, 'mvc/controllers/500test.js'))
      const rooseveltApp = roosevelt({
        appDir,
        errorPages: {
          internalServerError: '500test.js'
        },
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        await axios.get(`http://localhost:${context.app.get('params').http.port}/serverError`)
      } catch (err) {
        if (err.status === 500 && err.response.data.includes('500 custom test error page')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })

  it('should complete the request even though the server was closed in the middle of it and respond 503 to any other request made afterwards', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.copySync(path.join(__dirname, './util/503test.js'), path.join(appDir, 'mvc/controllers/503test.js'))
      const originalProcessExit = process.exit
      process.exit = () => {}
      const rooseveltApp = roosevelt({
        appDir,
        onServerStart: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      try {
        setTimeout(async () => {
          await rooseveltApp.stopServer()
        }, 500)
        const res = await axios.get(`http://localhost:${context.app.get('params').http.port}/longWait`)
        if (res.status === 200 && res.data.includes('longWait done')) pass = true
        else pass = false
        await axios.get(`http://localhost:${context.app.get('params').http.port}/`)
      } catch (err) {
        if (err.status === 503 && err.response.data.includes('503 Service Unavailable')) pass = true
        else pass = false
      }
      finish(capturedLogs => {
        process.exit = originalProcessExit
        if (pass) done()
        else done(new Error('server did not properly respond to the request'))
      })
    })()
  })
})
