/* eslint-env mocha */

const request = require('supertest')
const roosevelt = require('../roosevelt')

describe('body-parser', () => {
  before(async () => {
    // spin up the roosevelt app
    const rooseveltApp = roosevelt({
      makeBuildArtifacts: false,
      port: 40000,
      csrfProtection: false,
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
      }
    })

    await rooseveltApp.startServer()

    // open up simple post route
    rooseveltApp.expressApp.route('/bodyParser').post((req, res) => {
      res.send('done')
    })

    // bind app to test context
    context.app = rooseveltApp.expressApp
  })

  after(done => {
    // stop the server
    context.app.get('httpServer').close(() => {
      done()
    })
  })

  it('should respond with 413 error when too many urlencoded fields are sent', done => {
    // send a post with too many urlencoded fields
    request(context.app)
      .post('/paramLimit')
      .send('test1=stuff')
      .send('test2=more-stuff')
      .expect(413)
      .end((err, res) => {
        if (err) {
          throw err
        }

        done()
      })
  })

  it('should respond with 413 error when too many json fields are sent', done => {
    // send a post with too json fields
    request(context.app)
      .post('/paramLimit')
      .send({ test1: 'adam' })
      .send({ test2: 'bob' })
      .send({ test3: 'calvin' })
      .send({ test4: 'daniel' })
      .send({ test5: 'evan' })
      .expect(413)
      .end((err, res) => {
        if (err) {
          throw err
        }

        done()
      })
  })
})
