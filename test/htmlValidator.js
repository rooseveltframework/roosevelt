const { describe, it, before, after } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('HTML validator', () => {
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

  // an app folder of its own, rather than the test folder roosevelt would otherwise take from the file that required it
  const appDir = path.join(__dirname, 'app/htmlValidator')

  before(async () => {
    // spin up the roosevelt app
    context.rooseveltApp = roosevelt({
      appDir,
      mode: 'development',
      csrfProtection: false,
      expressSession: false,
      makeBuildArtifacts: false,
      http: {
        port: 30111
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
      }
    })

    await context.rooseveltApp.startServer()
  })

  after(async () => {
    // stop the server and delete the test app
    await context.rooseveltApp?.stopServer({ persistProcess: true })
    fs.rmSync(appDir, { recursive: true, force: true })
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
