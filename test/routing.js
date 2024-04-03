/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('routing', () => {
  const appDir = path.join(__dirname, 'app/routesTest')
  const appConfig = {
    appDir,
    mode: 'production',
    makeBuildArtifacts: true,
    csrfProtection: false,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        error: false
      }
    }
  }
  const context = {}

  beforeEach(() => {
    // drop test mvc structure into app directory
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))

    // drop a public file into app directory
    fs.ensureFileSync(path.join(appDir, 'public/text/hello.txt'), 'hello world')
  })

  afterEach(done => {
    // stop the server
    context.app.httpServer.close(() => {
      // wipe out the app directory
      fs.removeSync(appDir)

      done()
    })
  })

  it('should respond to a route handled in a controller file', done => {
    // spin up a roosevelt app
    roosevelt({
      ...appConfig,
      onServerStart: app => {
        // bind app to test context
        context.app = app

        // send a request to a route handled in a controller file
        request(app)
          .get('/HTMLTest')
          .expect(200)
          .end((err, res) => {
            if (err) {
              throw err
            }
            // ensure that the response is correct
            assert(res.text.includes('TitleX'), 'server did not properly respond to the request.')

            done()
          })
      }
    }).startServer()
  })

  it('should resolve a request to a public file', done => {
    // spin up a roosevelt app
    roosevelt({
      ...appConfig,
      hostPublic: true,
      onServerStart: app => {
        // bind app to test context
        context.app = app

        const prefix = app.get('routePrefix')

        // send a request to a route handled in a controller file
        request(app)
          .get(`${prefix}/text/hello.txt`)
          .expect(200)
          .end((err, res) => {
            if (err) {
              throw err
            }

            done()
          })
      }
    }).startServer()
  })

  it('should respond to route hosted in a subdirectory via routePrefix', done => {
    // spin up a roosevelt app
    roosevelt({
      ...appConfig,
      routePrefix: 'foo',
      onServerStart: app => {
        // bind app to test context
        context.app = app

        // send a request to a route handled in a controller file with an appended prefix
        request(app)
          .get('/foo/HTMLTest')
          .expect(200)
          .end((err, res) => {
            if (err) {
              throw err
            }
            // ensure that the response is correct
            assert(res.text.includes('TitleX'), 'server did not properly respond to the request.')

            done()
          })
      }
    }).startServer()
  })

  it('should resolve a request to a public file hosted in a subdirectory via routePrefix', done => {
    // spin up a roosevelt app
    roosevelt({
      ...appConfig,
      hostPublic: true,
      routePrefix: 'foo',
      onServerStart: app => {
        // bind app to test context
        context.app = app

        const prefix = app.get('routePrefix')

        // send a request to a route handled in a controller file
        request(app)
          .get(`${prefix}/text/hello.txt`)
          .expect(200)
          .end((err, res) => {
            if (err) {
              throw err
            }

            done()
          })
      }
    }).startServer()
  })
})
