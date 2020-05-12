/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

describe.skip('validator usage', () => {
  // establish test context
  const context = {
    // invalid html to test against
    badHTML: `
      <!DOCTYPE html
      <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <title>TitleX</title>
          <script type="text/javascript" ></script>
        </head>
        <body>
            <section>
            </section>
            <article>
              <p>cool text</p>
            </article>
          <h1>headingX
          <p>sentence1X</p>
          <p>sentence2X</p>
        </body>
      </html>`,

    // valid html to test against
    goodHTML: `
      <!DOCTYPE html>
      <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <title>Title</title>
        </head>
        <body>
          <h1>awesome html</h1>
        </body>
      </html>`
  }

  before(done => {
    // spin up the roosevelt app
    roosevelt({
      mode: 'development',
      generateFolderStructure: false,
      port: 40001,
      logging: {
        methods: {
          http: false,
          info: false,
          warn: false,
          error: false
        }
      },
      toobusy: {
        maxLagPerRequest: 700
      },
      frontendReload: {
        enable: false
      },
      onServerInit: app => {
        const router = app.get('router')

        // add route to invalid html
        router.get('/invalid', (req, res) => {
          res.send(context.badHTML)
        })

        // add route to invalid html with partial header
        router.get('/exceptionHeader', (req, res) => {
          res.set('partial', true)

          res.send(context.badHTML)
        })

        // add a route to invalid html that responds with a res.render without a model supplied
        router.get('/noModel', (req, res) => {
          res.render(path.join(__dirname, 'util/mvc/views/invalidHTML.html'))
        })

        // add route to invalid html that responds with a res.render and supplies a model with exception value set
        router.get('/exceptionModel', (req, res) => {
          res.render(path.join(__dirname, 'util/mvc/views/invalidHTML.html'), { _disableValidator: true })
        })

        // add a route to valid html
        router.get('/valid', (req, res) => {
          res.send(context.goodHTML)
        })
      },
      onServerStart: app => {
        // bind app to test context
        context.app = app

        done()
      }
    }).startServer()
  })

  after(() => {
    // stop the server
    context.app.httpServer.close()
  })
})
