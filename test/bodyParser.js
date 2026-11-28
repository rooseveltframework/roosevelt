const { describe, it, before, after } = require('node:test')

const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('body-parser', () => {
  // build artifacts are written here rather than to the test directory itself, since roosevelt otherwise defaults appDir to the directory of the requiring module
  const appDir = path.join(__dirname, 'app/bodyParser')

  // global vars the tests will need
  const context = {}

  before(async () => {
    // spin up the roosevelt app
    const rooseveltApp = roosevelt({
      appDir,
      makeBuildArtifacts: false,
      http: {
        port: 30100
      },
      csrfProtection: false,
      expressSession: false,
      logging: {
        methods: {
          http: false,
          info: false,
          warn: false,
          error: false
        }
      },
      frontendReload: {
        enable: false
      },
      // set some stingy limitations to easily test the config takes effect
      bodyParser: {
        urlEncoded: {
          extended: true,
          parameterLimit: 1
        },
        json: {
          limit: 10
        }
      },
      onServerInit: app => {
        // open up simple post route
        app.get('router').route('/bodyParser').post((req, res) => {
          res.json(req.body)
        })
      }
    })

    await rooseveltApp.startServer()

    // bind app to test context
    context.app = rooseveltApp.expressApp
    context.instance = rooseveltApp
  })

  after(async () => {
    // stop the server, then wipe out the app directory
    await context.instance.stopServer({ persistProcess: true })
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should parse urlencoded fields within the configured parameter limit', async () => {
    await request(context.app)
      .post('/bodyParser')
      .type('form')
      .send('test1=stuff')
      .expect(200, { test1: 'stuff' })
  })

  it('should respond with 413 error when too many urlencoded fields are sent', async () => {
    // send a post with more urlencoded fields than the parameter limit of 1
    await request(context.app)
      .post('/bodyParser')
      .type('form')
      .send('test1=stuff')
      .send('test2=more-stuff')
      .expect(413)
  })

  it('should parse a json body within the configured size limit', async () => {
    // {"a":"b"} is 9 bytes, inside the limit of 10
    await request(context.app)
      .post('/bodyParser')
      .send({ a: 'b' })
      .expect(200, { a: 'b' })
  })

  it('should respond with 413 error when a json body is over the configured size limit', async () => {
    // a body well over the limit of 10 bytes
    await request(context.app)
      .post('/bodyParser')
      .send({ test1: 'adam', test2: 'bob', test3: 'calvin', test4: 'daniel', test5: 'evan' })
      .expect(413)
  })
})
