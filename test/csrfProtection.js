const { describe, it, before, after } = require('node:test')

const axios = require('axios')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const express = require('express')
const assert = require('assert')
const { rmSync } = require('fs')
const path = require('path')
const closeSessionStores = require('./util/closeSessionStores')

// used to store cookie sid across requests since supertest drops the session object
let cookie

// build artifacts are written here rather than to the test directory itself, since roosevelt otherwise defaults appDir to the directory of the requiring module
const appDir = path.join(__dirname, 'app/csrfProtection')

describe('CSRF', () => {
  // every app in this file opens the same sqlite file, and windows will not remove the folder while any of them still holds it
  const startedApps = []

  // wipe out the test app directory even if a test or hook fails partway through
  after(() => {
    closeSessionStores(startedApps)
    rmSync(appDir, { recursive: true, force: true })
  })

  describe('CSRF protection enabled', () => {
    // open up testing context
    const context = {}

    before(async () => {
      const app = express()
      app.post('/attack', async (req, res) => {
        try {
          await axios.post(`http://localhost:${context.app.get('params').http.port}/protected`)
          res.sendStatus(200)
        } catch (err) {
          res.status(err.status).send(err)
        }
      })
      context.attackingApp = app

      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        appDir,
        csrfProtection: { requireTokens: true },
        expressSession: true,
        expressSessionStore: {
          filename: path.join(appDir, 'secrets/test-sessions.sqlite')
        },
        makeBuildArtifacts: true,
        http: {
          port: 30101
        },
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        htmlValidator: {
          enable: true
        },
        frontendReload: {
          enable: false
        },
        onServerInit: app => {
          const router = app.get('router')
          router.get('/', (req, res) => {
            res.json({ csrfToken: req.csrfToken() })
          })
          router.post('/protected', (req, res) => {
            res.json({ message: 'protected' })
          })
        }
      })

      await rooseveltApp.startServer()

      context.app = rooseveltApp.expressApp
      startedApps.push(rooseveltApp.expressApp)
      context.instance = rooseveltApp
    })

    after(async () => {
      // the server goes down first, then the session store lets go of its sqlite file, because windows will not remove a folder while anything still holds a file inside it
      await context.instance.stopServer({ persistProcess: true })
      closeSessionStores(context.app)
      rmSync(appDir, { recursive: true, force: true })
    })

    it('should reject CSRF attacks', (t, done) => {
      request(context.attackingApp)
        // a route on the attacking app that makes a POST against the CSRF app
        .post('/attack')
        .expect(403)
        .expect((res) => res.forbidden)
        .end((err, res) => {
          if (err) throw err
          done()
        })
    })

    it('should allow a POST from a valid request', (t, done) => {
      request(context.app)
        .get('/')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          const csrfToken = res.body.csrfToken
          assert(csrfToken)
          cookie = res.headers['set-cookie']

          request(context.app)
            .post('/protected')
            .set('X-CSRF-TOKEN', csrfToken)
            .set('Cookie', cookie)
            .expect(200)
            .end((err, res) => {
              if (err) throw (err)
              assert(JSON.stringify(res.body) === JSON.stringify({ message: 'protected' }))
              done()
            })
        })
    })

    it('should not allow a POST from an invalid request', (t, done) => {
      request(context.app)
        .get('/')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          const csrfToken = 'csrfToken' // a token is provided, but it is wrong
          assert(csrfToken)

          request(context.app)
            .post('/protected')
            .set('X-CSRF-TOKEN', csrfToken)
            .expect(403)
            .end((err, res) => {
              if (err) throw (err)
              assert(JSON.stringify(res.body) !== JSON.stringify({ message: 'protected' }))
              done()
            })
        })
    })
  })

  describe('CSRF protection disabled', () => {
    // open up testing context
    const context = {}

    before((t, done) => {
      (async () => {
        const app = express()

        app.post('/attack', async (req, res) => {
          try {
            await axios.post(`http://localhost:${context.app.get('params').http.port}/unprotected`)
            res.sendStatus(200)
          } catch (err) {
            res.status(err.status).send(err)
          }
        })

        context.attackingApp = app

        // spin up the roosevelt app
        const rooseveltApp = roosevelt({
          mode: 'development',
          appDir,
          csrfProtection: false,
          expressSession: false,
          makeBuildArtifacts: false,
          http: {
            port: 30102
          },
          logging: {
            methods: {
              http: false,
              info: false,
              warn: false,
              error: false
            }
          },
          htmlValidator: {
            enable: true
          },
          frontendReload: {
            enable: false
          },
          onServerInit: app => {
            const router = app.get('router')

            router.post('/unprotected', (req, res) => {
              res.send('this is unprotected')
            })
          },
          onServerStart: app => {
            // bind app to test context
            context.app = app
            startedApps.push(app)
            done()
          }
        })

        await rooseveltApp.startServer()
      })()
    })

    after((t, done) => {
      // stop the server, then let go of the sqlite file so the folder can be removed on windows too
      context.app.get('httpServer').close(() => {
        closeSessionStores(context.app)
        done()
      })
    })

    it('should allow a CSRF attack', (t, done) => {
      request(context.attackingApp)
        .post('/attack')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          done()
        })
    })

    it('should allow a POST without a CSRF token', (t, done) => {
      request(context.app)
        .post('/unprotected')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          done()
        })
    })
  })

  describe('CSRF exempted routes', () => {
    // open up testing context
    const context = {}

    before(async () => {
      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        appDir,
        csrfProtection: {
          requireTokens: true,
          exemptions: ['/test', '/test/*', '/*-example']
        },
        expressSession: true,
        expressSessionStore: {
          filename: path.join(appDir, 'secrets/test-sessions.sqlite')
        },
        makeBuildArtifacts: true,
        http: {
          port: 30103
        },
        logging: {
          methods: {
            http: false,
            info: false,
            warn: false,
            error: false
          }
        },
        htmlValidator: {
          enable: true
        },
        frontendReload: {
          enable: false
        },
        onServerInit: app => {
          const router = app.get('router')
          router.get('/', (req, res) => {
            const csrfToken = req.csrfToken()
            res.json({ csrfToken })
          })

          router.post('/protected', (req, res) => {
            res.send('protected')
          })

          router.post('/test', (req, res) => {
            res.send('/test response')
          })

          router.post('/test/foo', (req, res) => {
            res.send('/test/foo response')
          })

          router.post('/some-example', (req, res) => {
            res.send('/some-example response')
          })

          router.post('/another-example', (req, res) => {
            res.send('/another-example response')
          })
        }
      })

      await rooseveltApp.startServer()

      context.app = rooseveltApp.expressApp
      startedApps.push(rooseveltApp.expressApp)
      context.instance = rooseveltApp
    })

    after(async () => {
      // the server goes down first, then the session store lets go of its sqlite file, because windows will not remove a folder while anything still holds a file inside it
      await context.instance.stopServer({ persistProcess: true })
      closeSessionStores(context.app)
      rmSync(appDir, { recursive: true, force: true })
    })

    it('should not require a token on exempted routes', (t, done) => {
      // test the '/test' exemption
      request(context.app)
        .post('/test')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          assert(res.text === '/test response')
          assert(res.ok)
          assert(!res.forbidden)

          // test the 'test/*' exemption
          request(context.app)
            .post('/test/foo')
            .expect(200)
            .end((err, res) => {
              if (err) throw err
              assert(res.text === '/test/foo response')
              assert(res.ok)
              assert(!res.forbidden)
              done()
            })
        })
    })

    it('should not require a token on exempted routes with the glob format', (t, done) => {
      // test the '*-example' exemption
      request(context.app)
        .post('/some-example')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          assert(res.text === '/some-example response')
          assert(res.ok)
          assert(!res.forbidden)

          // try the '*-example' exemption on a different route
          request(context.app)
            .post('/another-example') // covered by the /*-other-example exemption
            .expect(200)
            .end((err, res) => {
              if (err) throw err
              assert(res.text === '/another-example response')
              assert(res.ok)
              assert(!res.forbidden)
              done()
            })
        })
    })

    it('should still protect routes not included in the exemptions', (t, done) => {
      // first we attempt to post without the token
      request(context.app)
        .post('/protected')
        .expect(403)
        .end((err, res) => {
          if (err) throw (err)
          assert(!res.ok)
          assert(res.forbidden)

          // then we get the token and attach it to headers to make a valid request
          request(context.app)
            .get('/')
            .expect(200)
            .end((err, res) => {
              if (err) throw err
              const csrfToken = res.body.csrfToken
              assert(csrfToken)
              cookie = res.headers['set-cookie']

              request(context.app)
                .post('/protected')
                .set('X-CSRF-TOKEN', csrfToken)
                .set('Cookie', cookie)
                .expect(200)
                .end((err, res) => {
                  if (err) throw (err)
                  assert(res.text === 'protected')
                  assert(res.ok)
                  assert(!res.forbidden)
                  done()
                })
            })
        })
    })
  })
})
