const { describe, it } = require('node:test')

const assert = require('assert')
const express = require('express')
const request = require('supertest')
const captureResponseBody = require('../lib/tools/captureResponseBody')

// rewriting a response body after a route has produced it, which is how the frontend reload script is injected
//
// this used to be the tamper module, and these cover the parts that are easy to get wrong when doing it by hand
describe('capturing a response body', () => {
  // builds an app that appends a marker to html responses, the way injectReload appends a script tag
  function appThatRewrites (options = {}) {
    const app = express()
    if (options.compress) app.use(require('compression')({ threshold: 0 }))
    app.use(captureResponseBody((req, res) => {
      if (!res.getHeader('Content-Type')?.includes('text/html')) return
      return body => body.replace('</body>', 'INJECTED</body>')
    }))
    options.routes(app)
    return app
  }

  it('should rewrite an html body', async () => {
    const app = appThatRewrites({ routes: app => app.get('/', (req, res) => res.type('html').send('<html><body>hi</body></html>')) })

    const res = await request(app).get('/')

    assert.match(res.text, /hiINJECTED<\/body>/)
  })

  it('should correct Content-Length rather than leaving the one the route set', async () => {
    // a body that grew while its declared length stayed put is a truncated page in the browser
    const app = appThatRewrites({ routes: app => app.get('/', (req, res) => res.type('html').send('<html><body>hi</body></html>')) })

    const res = await request(app).get('/')

    assert.strictEqual(Number(res.headers['content-length']), Buffer.byteLength(res.text))
  })

  it('should leave a response it does not accept completely alone', async () => {
    const app = appThatRewrites({ routes: app => app.get('/', (req, res) => res.type('json').send({ hello: 'world' })) })

    const res = await request(app).get('/')

    assert.deepStrictEqual(res.body, { hello: 'world' })
    assert.strictEqual(res.text.includes('INJECTED'), false)
  })

  it('should gather a body written in several chunks', async () => {
    // a route that streams its response never hands the whole body to one call, so it has to be collected
    const app = appThatRewrites({
      routes: app => app.get('/', (req, res) => {
        res.type('html')
        res.write('<html>')
        res.write('<body>one')
        res.write(' two')
        res.end('</body></html>')
      })
    })

    const res = await request(app).get('/')

    assert.match(res.text, /<body>one twoINJECTED<\/body>/)
  })

  it('should still be readable when the response is compressed', async () => {
    // compression is registered before this, so it wraps the rewritten body rather than the other way round
    //
    // getting that backwards means injecting into gzipped bytes and serving a broken page
    const app = appThatRewrites({ compress: true, routes: app => app.get('/', (req, res) => res.type('html').send('<html><body>hi</body></html>')) })

    const res = await request(app).get('/').set('Accept-Encoding', 'gzip')

    assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the response should still be compressed')
    assert.match(res.text, /hiINJECTED<\/body>/, 'and what comes out of it should be the rewritten html')
  })

  it('should send the body unchanged when the rewrite throws, rather than hanging the response', async () => {
    // a rewrite that throws outright rather than rejecting used to escape res.end, which took the process down and left the request waiting forever
    const app = express()
    app.use(captureResponseBody(() => () => { throw new Error('deliberate') }))
    app.get('/', (req, res) => res.type('html').send('<html><body>hi</body></html>'))

    // the warning this is meant to emit is collected rather than left to print, since the suite treats stray stderr as a failure
    const realWrite = process.stderr.write
    let warned = ''
    process.stderr.write = chunk => {
      warned += chunk
      return true
    }

    let res
    try {
      res = await request(app).get('/')
      await new Promise(resolve => setImmediate(resolve)) // the warning is emitted a tick after the response
    } finally {
      process.stderr.write = realWrite
    }

    assert.match(res.text, /<body>hi<\/body>/, 'the untouched body should still be sent')
    assert.strictEqual(res.statusCode, 200)
    assert.match(warned, /deliberate/, 'and the failure should be reported rather than swallowed')
  })

  it('should carry through the status code a route set', async () => {
    const app = appThatRewrites({ routes: app => app.get('/', (req, res) => res.status(404).type('html').send('<html><body>gone</body></html>')) })

    const res = await request(app).get('/')

    assert.strictEqual(res.statusCode, 404)
    assert.match(res.text, /goneINJECTED/)
  })
})
