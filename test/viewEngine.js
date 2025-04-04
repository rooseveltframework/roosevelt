/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const roosevelt = require('../roosevelt')

describe('view engines', () => {
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

  it('should render the teddy test page', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should be able to set the viewEngine if it was just a string', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should render the teddy test page', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should render the teddy test page', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should throw an Error if the ViewEngine parameter is formatted incorrectly', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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

  it('should throw an Error if the ViewEngine parameter is formatted incorrectly', done => {
    (async () => {
      let pass = false
      fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
      const rooseveltApp = roosevelt({
        appDir,
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
