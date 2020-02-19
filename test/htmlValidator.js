/* eslint-env mocha */

const assert = require('assert')
const appCleaner = require('./util/appCleaner')
const appGenerator = require('./util/appGenerator')
const execa = require('execa')
const http = require('http')
const path = require('path')
const os = require('os')
const ps = require('ps-node')
const request = require('supertest')
const roosevelt = require('../roosevelt')
const vnu = require('vnu-jar')

before(done => {
  (async () => {
    // kill any validators running on the system before tests start
    await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

    done()
  })()
})

after(done => {
  (async () => {
    // kill any stray validators
    await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

    done()
  })()
})

/**
 * validator start up tests
 */
describe('validator init', () => {
  before(() => {
    // generate a roosevelt app to run
    appGenerator({
      location: 'validatorInit',
      method: 'initServer',
      config: {
        mode: 'development',
        generateFolderStructure: false,
        frontendReload: {
          enable: false
        },
        htmlValidator: {
          enable: true,
          port: 9999,
          separateProcess: {
            enable: true,
            autoKiller: false
          }
        }
      }
    })
  })

  afterEach(done => {
    (async () => {
      // kill any stray validators
      await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

      done()
    })()
  })

  after(done => {
    (async () => {
      // wipe out the test app directory
      await appCleaner('validatorInit')

      done()
    })()
  })

  it('validator should persist when configured as a separate process and be killable via kill script', done => {
    (async () => {
      try {
        // spin up the app
        await execa.node(path.join(__dirname, 'app/validatorInit/app.js'), ['--development-mode'])
      } catch (err) {
        assert.fail(err)
      }

      await checkDetached()
      await killValidator()

      done()
    })()

    // check that the validator is still running
    async function checkDetached () {
      return new Promise(resolve => {
        // check for the existence of the validator process
        ps.lookup({
          command: 'java',
          arguments: 'nu.validator.servlet.Main'
        }, (err, result) => {
          if (err) {
            throw err
          } else {
            assert(result[0], 'validator did not persist')
          }
          resolve()
        })
      })
    }

    // run the killValidator script and check that validator was actually killed
    async function killValidator () {
      // run the killValidator script
      await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

      // prove that the validator has actually been killed
      return new Promise(resolve => {
        ps.lookup({
          command: 'java',
          arguments: 'nu.validator.servlet.Main'
        }, (err, result) => {
          if (err) {
            throw err
          } else {
            assert.strictEqual(result[0], undefined, 'validator process was not killed')
          }
          resolve()
        })
      })
    }
  })

  it('validator should complain when Java is missing', done => {
    (async () => {
      // spin up the app with a wiped out path
      const { stderr } = await execa.node(path.join(__dirname, 'app/validatorInit/app.js'), ['--development-mode'], { extendEnv: false, env: { PATH: null, path: null } })

      // check for the java error
      if (!stderr.includes('You must install Java to continue')) {
        assert.fail('Roosevelt did not complain that Java was missing')
      }

      done()
    })()
  })

  it('should detect a detached validator on runtime and skip starting up a new one', done => {
    // manually spin up a validator
    const validator = execa('java', ['-Xss1024k', '-XX:ErrorFile=' + os.tmpdir() + '/java_error%p.log', '-cp', vnu, 'nu.validator.servlet.Main', 9999])

    validator.stdout.on('data', data => {
      // wait for the validator to start
      if (data.includes('Checker service started')) {
        // start the roosevelt app
        startApp()
      }
    })

    async function startApp () {
      // spin up the app
      const { stdout } = await execa.node(path.join(__dirname, 'app/validatorInit/app.js'), ['--development-mode'])

      // check that the app discovered the validator
      if (!stdout.includes('Detached validator found')) {
        assert.fail('Roosevelt did not detect a detached validator')
      }

      done()
    }
  })

  it('validator should detect that configured port is in use and complain about it', done => {
    (async () => {
      // start up an http server on the validator port
      const server = http.createServer((req, res) => {
        res.end()
      }).listen(9999)

      // spin up the app
      try {
        await execa.node(path.join(__dirname, 'app/validatorInit/app.js'), ['--development-mode'])
      } catch (err) {
        // check for port in use error
        if (!err.stderr.includes('is using this port already')) {
          assert.fail('Roosevelt did not complain that validator port was in use')
        }
      }

      server.close()

      done()
    })()
  })

  it('validator should time out after 30 seconds of inactivity', done => {
    let timeoutError

    // spin up the app
    const app = execa.node(path.join(__dirname, 'app/validatorInit/app.js'), ['--development-mode', '--hacky-sinon-timer'])

    // tell app to setup sinon clock
    app.send('sinon init')

    app.stdout.on('data', data => {
      // wait for the validator init
      if (data.includes('Starting HTML validator')) {
        // tell app to trigger 30 seconds of time
        app.send('warp time')
      }
    })

    app.stderr.on('data', data => {
      // the test passes if we get this error
      if (data.includes('has been disabled because it has timed out')) {
        timeoutError = true
      }
    })

    app.on('exit', () => {
      if (!timeoutError) {
        assert.fail('validator did not time out')
      }

      done()
    })
  })
})

describe('validator usage', () => {
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
      viewEngine: [
        'html: teddy'
      ],
      htmlValidator: {
        enable: true,
        port: 9000,
        showWarnings: false,
        exceptions: {
          requestHeader: 'partial',
          modelValue: '_disableValidator'
        },
        separateProcess: {
          enable: false,
          autoKiller: false
        }
      },
      onServerStart: app => {
        // add route to invalid html
        app.get('/invalid', (req, res) => {
          res.send(context.badHTML)
        })

        // add route to invalid html with partial header
        app.get('/exceptionHeader', (req, res) => {
          res.set('partial', true)

          res.send(context.badHTML)
        })

        // add a route to invalid html that responds with a res.render without a model supplied
        app.get('/noModel', (req, res) => {
          res.render(path.join(__dirname, 'util/mvc/views/invalidHTML.html'))
        })

        // add route to invalid html that responds with a res.render and supplies a model with exception value set
        app.get('/exceptionModel', (req, res) => {
          res.render(path.join(__dirname, 'util/mvc/views/invalidHTML.html'), { _disableValidator: true })
        })

        // add a route to valid html
        app.get('/valid', (req, res) => {
          res.send(context.goodHTML)
        })

        // bind app to test context
        context.app = app

        done()
      }
    }).startServer()
  })

  after(done => {
    (async () => {
      // stop the server
      context.app.httpServer.close(async () => {
        // kill the validator
        await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

        done()
      })
    })()
  })

  /**
   * validator usage tests
   */
  it('invalid HTML should trigger an error page', done => {
    // request a page with bad html
    request(context.app)
      .get('/invalid')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is a validation error page
          assert(res.text.includes('HTML did not pass validation'), 'Validation page was not displayed on a route with invalid HTML')

          // warnings are disabled here so also check that none are displayed
          assert(!res.text.includes('<h2>Warnings:</h2>'), 'HTML validation page displayed warnings when warnings were disabled')
        }

        done()
      })
  })

  it('valid HTML should load normally', done => {
    // request a page with valid html
    request(context.app)
      .get('/valid')
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is not an error page
          assert(res.text.includes('<h1>awesome html</h1>'), 'Valid page did not render when validator was enabled')
        }

        done()
      })
  })

  it('HTML error page should display warnings when feature is enabled', done => {
    // cache validator params
    const params = context.app.get('params').htmlValidator

    // enable warnings
    params.showWarnings = true

    // request a page with invalid html
    request(context.app)
      .get('/invalid')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that warnings are displayed on error page
          assert(res.text.includes('<h2>Warnings:</h2>'), 'HTML validation error page did not display warnings')
        }

        // reset warnings param
        params.showWarnings = false

        done()
      })
  })

  it('invalid HTML should be ignored when exception response header is set', done => {
    // request a page with invalid html and exception res header set
    request(context.app)
      .get('/exceptionHeader')
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is not an error page
          assert(!res.text.includes('HTML did not pass validation'), 'Exception response header did not prevent validation')
        }

        done()
      })
  })

  it('invalid HTML should be ignored when exception request header is set', done => {
    // request a page with invalid html and exception req header set
    request(context.app)
      .get('/invalid')
      .set('partial', true)
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is not an error page
          assert(!res.text.includes('HTML did not pass validation'), 'Exception request header did not prevent validation')
        }

        done()
      })
  })

  it('validator should still function on res.renders without models', done => {
    // request a page with invalid html and exception model value set
    request(context.app)
      .get('/noModel')
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is a validation error page
          assert(res.text.includes('HTML did not pass validation'), 'Validation page was not displayed on a route with invalid HTML')
        }

        done()
      })
  })

  it('invalid HTML should be ignored when exception model value is set', done => {
    // request a page with invalid html and exception model value set
    request(context.app)
      .get('/exceptionModel')
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        } else {
          // check that the response page is not an error page
          assert(!res.text.includes('HTML did not pass validation'), 'Exception model value did not prevent validation')
        }

        done()
      })
  })

  /**
   * This test commits the cardinal sin of polluting the environment by killing the validator
   * Any new tests in that category should go before this one
   * This is better than having to start/kill another instance of the validator just to hit one line
   */
  it('error page should report problems with validator', done => {
    (async () => {
      await execa.node(path.join(__dirname, '../lib/scripts/killValidator.js'))

      // request a page with invalid html and exception model value set
      request(context.app)
        .get('/invalid')
        .expect(500)
        .end((err, res) => {
          if (err) {
            throw err
          } else {
            // check that the response page reports severed connection to validator
            assert(res.text.includes('Unable to connect to HTML validator'), 'Error page did not report disconnect')
          }

          done()
        })
    })()
  })
})

/**
 * auto killer tests
 */
describe('validator auto killer', () => {
  it('auto killer process should kill validator after 1 second', done => {
    ;(async () => {
      // spawn an instance of the html validator
      const validator = execa('java', ['-Xss1024k', '-XX:ErrorFile=' + os.tmpdir() + '/java_error%p.log', '-cp', vnu, 'nu.validator.servlet.Main', 9999])
      const validatorPID = validator.pid

      // spawn an instance of the auto killer script
      await execa('node', [path.join(__dirname, '../lib/scripts/autoKillValidator.js'), 1000, 'true'])

      // prove that the validator has actually been killed
      ps.lookup({ pid: validatorPID }, (err, result) => {
        if (err) {
          throw err
        } else {
          assert.strictEqual(result[0], undefined, 'validator process was not killed')
          done()
        }
      })
    })()
  })

  it('stale auto killer scripts should be terminated and a new one spawned at runtime', done => {
    ;(async () => {
      let autokillerPID

      // spawn an instance of the auto killer script
      const autokiller = execa('node', [path.join(__dirname, '../lib/scripts/autoKillValidator.js'), 30000, 'true'])

      // start up a roosevelt app
      roosevelt({
        mode: 'development',
        generateFolderStructure: false,
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
        htmlValidator: {
          enable: true,
          separateProcess: {
            enable: true,
            autoKiller: true,
            autoKillerTimeout: 3650000
          }
        }
      }).initServer(async () => {
        await checkKilled()
        await checkNew()
        await killAgain()

        // kill any stray validators
        await execa('node', [path.join(__dirname, '../lib/scripts/killValidator.js')])

        done()
      })

      // prove that the stale autokiller was killed
      async function checkKilled () {
        return new Promise(resolve => {
          ps.lookup({ pid: autokiller.pid }, (err, result) => {
            if (err) {
              throw err
            } else {
              assert.strictEqual(result[0], undefined, 'auto killer process was not killed')
              resolve()
            }
          })
        })
      }

      // check that app spawned a new one
      async function checkNew () {
        return new Promise(resolve => {
          ps.lookup({
            command: 'node',
            arguments: 'autoKillValidator.js'
          }, (err, result) => {
            if (err) {
              throw err
            } else {
              assert(result[0], 'app did not spawn an auto killer')
              autokillerPID = result[0].pid
              resolve()
            }
          })
        })
      }

      // kill that new one
      async function killAgain () {
        return new Promise(resolve => {
          ps.kill(Number(autokillerPID), () => {
            resolve()
          })
        })
      }
    })()
  })
})
