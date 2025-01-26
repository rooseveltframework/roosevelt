/* eslint-env mocha */

const assert = require('assert')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('validator usage', () => {
  // invalid html to test against
  const invalidHTML = `
    <!DOCTYPE html>
    <html lang='en'>
      <head>
        <meta charset='utf-8'>
      </head>
      <body
        <h1>hello</h1>
      </body>
    </html>`

  // valid html to test against
  const validHTML = `
    <!DOCTYPE html>
    <html lang='en'>
      <head>
        <meta charset='utf-8'>
        <title>Valid</title>
      </head>
      <body>
        <h1>hello</h1>
      </body>
    </html>`

  // open up testing context
  const context = {}

  before(done => {
    (async () => {
      // spin up the roosevelt app
      const rooseveltApp = roosevelt({
        mode: 'development',
        csrfProtection: false,
        makeBuildArtifacts: false,
        port: 40001,
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

          // add route to invalid html
          router.get('/invalid', (req, res) => {
            res.send(invalidHTML)
          })

          // add a route to valid html
          router.get('/valid', (req, res) => {
            res.send(validHTML)
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

  after(() => {
    // stop the server
    context.app.get('httpServer').close()
  })

  it('should respond with error page on invalid html', async () => {
    const res = await request(context.app)
      .get('/invalid')
      .expect(500)

    assert(res.text.includes('HTML did not pass validator'))
  })

  it('should respond normally to valid html', async () => {
    const res = await request(context.app)
      .get('/valid')
      .expect(200)

    assert(!res.text.includes('HTML did not pass validator'))
  })
})
