/* eslint-env mocha */

const axios = require('axios')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const express = require('express')
const assert = require('assert')

describe('CSRF protection enabled', () => {
  // open up testing context
  const context = {}

  before(done => {
    (async () => {
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
            res.json({ message: 'protected!' })
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
            assert(JSON.stringify(res.body) === JSON.stringify({ message: 'protected!' }))
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
