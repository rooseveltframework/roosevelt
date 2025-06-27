/* eslint-env mocha */

const axios = require('axios')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const express = require('express')
const assert = require('assert')
const { rmSync } = require('fs')
const path = require('path')

describe('CSRF', () => {
  describe('CSRF protection enabled', () => {
    // open up testing context
    before(async () => {
      const app = express()
      app.post('/attack', async (req, res) => {
        try {
          await axios.post(`http://localhost:${context.app.get('params').http.port}/protected`)
          res.send(200)
        } catch (err) {
          res.status(err.status).send(err)
        }
      })
      context.attackingApp = app

      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        csrfProtection: true,
        expressSession: true,
        expressSessionStore: {
          filename: 'test/secrets/test-sessions.sqlite'
        },
        makeBuildArtifacts: true,
        http: {
          port: 40001
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
            const token = req.csrfToken()
            res.json({ token })
          })
          router.post('/protected', (req, res) => {
            res.json({ message: 'protected' })
          })
        }
      })

      await rooseveltApp.startServer()

      context.app = rooseveltApp.expressApp
      context.instance = rooseveltApp
    })

    after(async () => {
      // stop the server
      rmSync(path.join(__dirname, './secrets'), { recursive: true, force: true })
      await context.instance.stopServer({ persistProcess: true })
    })

    it('should reject CSRF attacks', done => {
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

    it('should allow a POST from a valid request', done => {
      request(context.app)
        .get('/')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          const token = res.body.token
          assert(token)

          request(context.app)
            .post('/protected')
            .set('X-CSRF-TOKEN', token)
            .expect(200)
            .end((err, res) => {
              if (err) throw (err)
              assert(JSON.stringify(res.body) === JSON.stringify({ message: 'protected' }))
              done()
            })
        })
    })
  })

  describe('CSRF protection disabled', () => {
    // open up testing context
    const context = {}

    before(done => {
      (async () => {
        const app = express()

        app.post('/attack', async (req, res) => {
          try {
            await axios.post(`http://localhost:${context.app.get('params').http.port}/unprotected`)
            res.send(200)
          } catch (err) {
            res.status(err.status).send(err)
          }
        })

        context.attackingApp = app

        // spin up the roosevelt app
        const rooseveltApp = roosevelt({
          mode: 'development',
          csrfProtection: false,
          makeBuildArtifacts: false,
          http: {
            port: 40001
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
            done()
          }
        })

        await rooseveltApp.startServer()
      })()
    })

    after(done => {
      // stop the server
      context.app.get('httpServer').close(() => done())
    })

    it('should allow a CSRF attack', done => {
      request(context.attackingApp)
        .post('/attack')
        .expect(200)
        .end((err, res) => {
          if (err) throw err
          done()
        })
    })

    it('should allow a POST without a CSRF token', done => {
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
    before(async () => {
      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        csrfProtection: {
          exemptions: ['/test', '/test/*', '/*-example']
        },
        expressSession: true,
        expressSessionStore: {
          filename: 'test/secrets/test-sessions.sqlite'
        },
        makeBuildArtifacts: true,
        http: {
          port: 40001
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
            const token = req.csrfToken()
            res.json({ token })
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
      context.instance = rooseveltApp
    })

    after(async () => {
      // stop the server
      rmSync(path.join(__dirname, './secrets'), { recursive: true, force: true })
      await context.instance.stopServer({ persistProcess: true })
    })

    it('should not require a token on exempted routes', done => {
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

    it('should not require a token on exempted routes with the glob format', done => {
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

    it('should still protect routes not included in the exemptions', done => {
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
              const token = res.body.token
              assert(token)

              request(context.app)
                .post('/protected')
                .set('X-CSRF-TOKEN', token)
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
