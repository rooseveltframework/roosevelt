/* eslint-env mocha */

const fs = require('fs')
const axios = require('axios')
const request = require('supertest')
const path = require('path')
const roosevelt = require('../roosevelt')
const express = require('express')

describe('CSRF protection enabled', () => {
  // open up testing context
  const context = {}

  before(done => {
    (async () => {
      const app = express()

      app.post('/attackProtected', async (req, res) => {
        try {
          // extracting the token from the cookies also does not allow a CSRF injection
          const token = await axios.get(`http://localhost:${context.app.get('params').http.port}/token`)

          await axios.post(`http://localhost:${context.app.get('params').http.port}/protected`, {
            headers: { cookie: token.headers['set-cookie'] }
          })

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

          router.get('/token', (req, res) => {
            const token = req.csrfToken()
            res.json({ token })
          })

          router.post('/protected', (req, res) => {
            if (req.csrfToken()) {
              res.json({ message: 'Success!' })
            } else {
              res.status(403).json({ message: 'Invalid CSRF token' })
            }
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

    // remove secrets folder
    fs.rmSync(path.join(__dirname, './secrets'), { recursive: true, force: true })
  })

  it('should reject CSRF attacks', done => {
    request(context.attackingApp)
      // a route on the attacking app that makes a POST against the CSRF app (also attempts to extract the token from the cookies)
      .post('/attackProtected')
      .expect(403)
      .expect((res) => res.forbidden)
      .end((err, res) => {
        if (err) throw err
        done()
      })
  })

  it('should allow a POST from a valid request', done => {
    request(context.app)
      .get('/token')
      .end((err, res) => {
        if (err) throw err

        // retrieve cookie from response to be added to the next request
        const cookie = res.headers['set-cookie']
        request(context.app)
          .post('/protected')
          .set('Cookie', cookie)
          .expect(200)
          .end((err, res) => {
            if (err) throw (err)
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

      app.post('/attackUnprotected', async (req, res) => {
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
      .post('/attackUnprotected')
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
