/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('public folder', () => {
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

  it('should allow for a custom favicon and GET that favicon on request', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/faviconTest.ico'), path.join(appDir, 'statics/images/faviconTest.ico'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should allow for no favicon with a null paramter', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should allow the user to set favicon to a wrong or non-existent path and have no favicon show up', done => {
    (async () => {
      let pass = false
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should set the name of folder inside of public to the version inside of package.json', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      fs.writeFileSync(path.join(appDir, 'package.json'), '{ "version": "0.5.1", "rooseveltConfig": {} }')
      const rooseveltApp = roosevelt({
        appDir,
        makeBuildArtifacts: true,
        versionedPublic: true,
        onServerInit: app => {
          context.app = app
        }
      })
      await rooseveltApp.startServer()
      finish((capturedLogs) => {
        if (capturedLogs.includes('roosevelt/test/app/public/0.5.1')) pass = true
        if (pass) done()
        else done(new Error('Versioned public folder not created'))
      })
    })()
  })
})
