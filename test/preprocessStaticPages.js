const { describe, it, after, beforeEach } = require('node:test')
const captureLogs = require('./util/captureLogs')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const roosevelt = require('../roosevelt')

describe('static page generator', () => {
  const appDir = path.join(__dirname, 'app/staticPages')
  const pagesDir = path.join(appDir, 'statics/pages')
  const publicDir = path.join(appDir, 'public')

  const appConfig = {
    appDir,
    logging: {
      methods: {
        http: false,
        info: false,
        warn: false,
        error: false,
        verbose: false
      }
    },
    makeBuildArtifacts: true,
    csrfProtection: false,
    expressSession: false,
    htmlValidator: { enable: false },
    viewEngine: 'html: teddy',
    html: { sourcePath: 'pages' }
  }

  // writes a page into the statics source directory
  function writePage (name, contents) {
    const file = path.join(pagesDir, name)
    fs.ensureDirSync(path.dirname(file))
    fs.writeFileSync(file, contents)
  }

  // reads a rendered page, or returns null when it was not generated
  function readPage (relativePath) {
    const file = path.join(publicDir, relativePath)
    return fs.pathExistsSync(file) ? fs.readFileSync(file, 'utf8') : null
  }

  beforeEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.ensureDirSync(pagesDir)
  })

  after(() => {
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  // view engines disagree about how they hand the markup back: teddy returns it, pug calls the callback, and ejs returns
  // a promise when it is given no callback
  // these check that the static page generator works with all three, so it is not tied to whichever engine roosevelt's
  // own sample apps happen to use
  describe('with view engines other than teddy', () => {
    it('should render a static page with ejs, which returns a promise', async () => {
      writePage('ejsPage.ejs', '<html><body><h1><%= greeting %></h1></body></html>')
      fs.writeFileSync(path.join(pagesDir, 'ejsPage.js'), 'module.exports = () => ({ greeting: \'hello from ejs\' })')

      await roosevelt({ ...appConfig, viewEngine: 'ejs: ejs' }).initServer()

      assert.ok(readPage('ejsPage.html').includes('<h1>hello from ejs</h1>'), `got: ${readPage('ejsPage.html')}`)
    })

    it('should render a static page with pug, which calls a callback', async () => {
      writePage('pugPage.pug', 'html\n  body\n    h1= greeting')
      fs.writeFileSync(path.join(pagesDir, 'pugPage.js'), 'module.exports = () => ({ greeting: \'hello from pug\' })')

      await roosevelt({ ...appConfig, viewEngine: 'pug: pug' }).initServer()

      assert.ok(readPage('pugPage.html').includes('<h1>hello from pug</h1>'), `got: ${readPage('pugPage.html')}`)
    })

    it('should render pages with more than one engine registered at once', async () => {
      writePage('fromTeddy.html', '<p>{greeting}</p>')
      fs.writeFileSync(path.join(pagesDir, 'fromTeddy.js'), 'module.exports = () => ({ greeting: \'teddy page\' })')
      writePage('fromEjs.ejs', '<p><%= greeting %></p>')
      fs.writeFileSync(path.join(pagesDir, 'fromEjs.js'), 'module.exports = () => ({ greeting: \'ejs page\' })')

      await roosevelt({ ...appConfig, viewEngine: ['html: teddy', 'ejs: ejs'] }).initServer()

      assert.ok(readPage('fromTeddy.html').includes('teddy page'), `teddy page got: ${readPage('fromTeddy.html')}`)
      assert.ok(readPage('fromEjs.html').includes('ejs page'), `ejs page got: ${readPage('fromEjs.html')}`)
    })

    it('should report an engine that fails to render rather than writing the error into the page', async () => {
      let captured = ''
      writePage('index.ejs', '<p><%= nope( %></p>') // not valid ejs, so the engine hands back an error
      captureLogs.start()
      try {
        await roosevelt({
          ...appConfig,
          logging: { methods: { http: false, info: false, warn: false, verbose: false } },
          viewEngine: 'ejs: ejs'
        }).initServer()
      } finally {
        captured = captureLogs.stop()
      }

      assert.ok(captured.includes('failed to parse'), `expected the failure to be reported, got: ${JSON.stringify(captured.slice(0, 300))}`)
      assert.strictEqual(readPage('index.html'), null)
    })

    it('should pick up an edited ejs page on a later build rather than caching it', async () => {
      writePage('index.ejs', '<p>before</p>')
      await roosevelt({ ...appConfig, viewEngine: 'ejs: ejs' }).initServer()
      assert.ok(readPage('index.html').includes('before'))

      writePage('index.ejs', '<p>after</p>')
      await roosevelt({ ...appConfig, viewEngine: 'ejs: ejs' }).initServer()

      assert.ok(readPage('index.html').includes('after'), `got: ${readPage('index.html')}`)
    })

    it('should pick up an edited model on a later build rather than caching it', async () => {
      writePage('modelPage.html', '<p>{greeting}</p>')
      fs.writeFileSync(path.join(pagesDir, 'modelPage.js'), 'module.exports = () => ({ greeting: \'before\' })')
      await roosevelt({ ...appConfig }).initServer()
      assert.ok(readPage('modelPage.html').includes('before'))

      // node keeps what it requires, so this is what stops a rebuild handing back the values the model had on the first build
      fs.writeFileSync(path.join(pagesDir, 'modelPage.js'), 'module.exports = () => ({ greeting: \'after\' })')
      await roosevelt({ ...appConfig }).initServer()

      assert.ok(readPage('modelPage.html').includes('after'), `got: ${readPage('modelPage.html')}`)
    })

    it('should pick up an edited teddy page on a later build rather than caching it', async () => {
      writePage('index.html', '<p>before</p>')
      await roosevelt({ ...appConfig }).initServer()
      assert.ok(readPage('index.html').includes('before'))

      writePage('index.html', '<p>after</p>')
      await roosevelt({ ...appConfig }).initServer()

      assert.ok(readPage('index.html').includes('after'), `got: ${readPage('index.html')}`)
    })
  })

  it('should render a static page', async () => {
    writePage('index.html', '<html><body><h1>hello</h1></body></html>')

    await roosevelt({ ...appConfig }).initServer()

    assert.ok(readPage('index.html').includes('<h1>hello</h1>'))
  })

  it('should not render pages when makeBuildArtifacts is false', async () => {
    writePage('index.html', '<html><body><h1>hello</h1></body></html>')

    await roosevelt({ ...appConfig, makeBuildArtifacts: false }).initServer()

    assert.strictEqual(readPage('index.html'), null)
  })

  it('should render pages in subdirectories preserving their structure', async () => {
    writePage(path.join('nested', 'deep.html'), '<html><body><p>deep</p></body></html>')

    await roosevelt({ ...appConfig }).initServer()

    assert.ok(readPage(path.join('nested', 'deep.html')).includes('deep'))
  })

  it('should populate a page from a matching model file', async () => {
    writePage('modeled.html', '<html><body><p>{greeting}</p></body></html>')
    fs.writeFileSync(path.join(pagesDir, 'modeled.js'), 'module.exports = () => ({ greeting: "from the model" })')

    await roosevelt({ ...appConfig }).initServer()

    assert.ok(readPage('modeled.html').includes('from the model'))
  })

  it('should populate a page from a model supplied in the html.models param', async () => {
    writePage('paramModel.html', '<html><body><p>{greeting}</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', models: { 'paramModel.html': { greeting: 'from the param' } } } }).initServer()

    assert.ok(readPage('paramModel.html').includes('from the param'))
  })

  it('should apply a global model to every page', async () => {
    writePage('globalModel.html', '<html><body><p>{greeting}</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', models: { '*': { greeting: 'from the global model' } } } }).initServer()

    assert.ok(readPage('globalModel.html').includes('from the global model'))
  })

  it('should not render js or json files as pages', async () => {
    fs.writeFileSync(path.join(pagesDir, 'notapage.js'), 'module.exports = () => ({})')
    fs.writeFileSync(path.join(pagesDir, 'notapage.json'), '{}')
    writePage('index.html', '<html><body><p>real page</p></body></html>')

    await roosevelt({ ...appConfig }).initServer()

    assert.ok(readPage('index.html'))
    assert.strictEqual(readPage('notapage.js'), null)
    assert.strictEqual(readPage('notapage.json'), null)
  })

  it('should skip pages carrying a roosevelt-blocklist comment', async () => {
    writePage('skipped.html', '<!-- roosevelt-blocklist -->\n<html><body><p>skip me</p></body></html>')
    writePage('index.html', '<html><body><p>keep me</p></body></html>')

    await roosevelt({ ...appConfig }).initServer()

    assert.ok(readPage('index.html'))
    assert.strictEqual(readPage('skipped.html'), null)
  })

  it('should only render pages on the allowlist when one is supplied', async () => {
    writePage('wanted.html', '<html><body><p>wanted</p></body></html>')
    writePage('unwanted.html', '<html><body><p>unwanted</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', allowlist: ['wanted.html'] } }).initServer()

    assert.ok(readPage('wanted.html'))
    assert.strictEqual(readPage('unwanted.html'), null)
  })

  it('should skip pages on the blocklist', async () => {
    writePage('wanted.html', '<html><body><p>wanted</p></body></html>')
    writePage('unwanted.html', '<html><body><p>unwanted</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', blocklist: ['unwanted.html'] } }).initServer()

    assert.ok(readPage('wanted.html'))
    assert.strictEqual(readPage('unwanted.html'), null)
  })

  it('should write each page to its own folder when folderPerPage is true', async () => {
    writePage('about.html', '<html><body><p>about</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', folderPerPage: true } }).initServer()

    assert.ok(readPage(path.join('about', 'about.html')))
  })

  it('should name the file in each folder when folderPerPage is a string', async () => {
    writePage('about.html', '<html><body><p>about</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', folderPerPage: 'index.html' } }).initServer()

    assert.ok(readPage(path.join('about', 'index.html')))
  })

  it('should not nest a page whose name already matches the folderPerPage string', async () => {
    writePage('index.html', '<html><body><p>index</p></body></html>')

    await roosevelt({ ...appConfig, html: { sourcePath: 'pages', folderPerPage: 'index.html' } }).initServer()

    assert.ok(readPage('index.html'), 'index.html should stay at the top level rather than becoming index/index.html')
  })

  it('should warn when folderPerPage is an improperly formatted string', async () => {
    writePage('about.html', '<html><body><p>about</p></body></html>')

    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, verbose: false } },
        html: { sourcePath: 'pages', folderPerPage: 'nested/index.html' }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }

    assert.ok(captured.includes('improperly formatted string'), `expected a warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    assert.ok(readPage('about.html'), 'the page should still be written to its default destination')
  })

  it('should warn when folderPerPage is neither a boolean nor a string', async () => {
    writePage('about.html', '<html><body><p>about</p></body></html>')

    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, verbose: false } },
        html: { sourcePath: 'pages', folderPerPage: 42 }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }

    assert.ok(captured.includes('neither a boolean nor a string'), `expected a warning, got: ${JSON.stringify(captured.slice(0, 300))}`)
    assert.ok(readPage('about.html'), 'the page should still be written to its default destination')
  })

  it('should minify the rendered html when minification is enabled', async () => {
    writePage('minified.html', '<html>\n  <body>\n    <p>lots    of    space</p>\n  </body>\n</html>')

    await roosevelt({ ...appConfig, mode: 'production', minify: true, html: { sourcePath: 'pages', minifier: { enable: true } } }).initServer()

    const page = readPage('minified.html')
    assert.strictEqual(page.includes('\n  '), false, `expected minified output, got: ${JSON.stringify(page)}`)
  })

  it('should log an error when a page fails to render', async () => {
    // a page whose model file throws will fail while being parsed
    writePage('broken.html', '<html><body><p>{greeting}</p></body></html>')
    fs.writeFileSync(path.join(pagesDir, 'broken.js'), 'module.exports = () => { throw new Error("model blew up") }')

    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }

    assert.ok(captured.includes('failed to parse'), `expected a parse failure to be logged, got: ${JSON.stringify(captured.slice(0, 400))}`)
  })

  it('should log an error when there is no view engine for a page file type', async () => {
    writePage('mystery.xyz', 'some content')

    let captured = ''
    captureLogs.start()
    try {
      await roosevelt({
        ...appConfig,
        logging: { methods: { http: false, info: false, warn: false, verbose: false } }
      }).initServer()
    } finally {
      captured = captureLogs.stop()
    }

    assert.ok(captured.includes('no view engine'), `expected a missing view engine error, got: ${JSON.stringify(captured.slice(0, 400))}`)
  })

  describe('html validation reporting', () => {
    // captures everything roosevelt logs while it initializes
    async function captureInit (config) {
      let captured = ''
      captureLogs.start()
      try {
        await roosevelt(config).initServer()
      } finally {
        captured = captureLogs.stop()
      }
      return captured
    }

    const validatingConfig = {
      ...appConfig,
      mode: 'development',
      frontendReload: { enable: false },
      logging: { methods: { http: false, info: false, warn: false, verbose: false } },
      htmlValidator: { enable: true }
    }

    it('should report why a page failed validation rather than only that it failed', async () => {
      writePage('broken.html', '<html><body><p>no head, no lang</p></body></html>')

      const captured = await captureInit(validatingConfig)

      assert.ok(captured.includes('HTML validation error'), `expected a validation failure to be reported, got: ${JSON.stringify(captured.slice(0, 400))}`)
      assert.ok(captured.includes('lang'), `expected the missing lang attribute to be named, got: ${JSON.stringify(captured.slice(0, 400))}`)
    })

    it('should report the line and column of each validation error', async () => {
      writePage('broken.html', '<html><body><p>no head, no lang</p></body></html>')

      const captured = await captureInit(validatingConfig)

      assert.ok(/\(line \d+, column \d+\)/.test(captured), `expected line and column numbers, got: ${JSON.stringify(captured.slice(0, 400))}`)
    })

    it('should unescape html entities in validation messages', async () => {
      writePage('broken.html', '<html><body><p>no head, no lang</p></body></html>')

      const captured = await captureInit(validatingConfig)

      assert.ok(captured.includes('<html>'), 'tag names in messages should be readable rather than html escaped')
      assert.strictEqual(captured.includes('&lt;html&gt;'), false, 'messages should not still be html escaped')
    })

    it('should no longer tell the user to upload the file elsewhere when it can name the errors', async () => {
      writePage('broken.html', '<html><body><p>no head, no lang</p></body></html>')

      const captured = await captureInit(validatingConfig)

      assert.strictEqual(captured.includes('validator.w3.org'), false, 'the generic fallback should not be used when the errors are known')
    })

    it('should not report validation errors for a valid page', async () => {
      writePage('valid.html', '<!DOCTYPE html>\n<html lang="en"><head><title>fine</title></head><body><p>all good</p></body></html>')

      const captured = await captureInit(validatingConfig)

      assert.strictEqual(captured.includes('HTML validation error'), false, `expected no validation errors, got: ${JSON.stringify(captured.slice(0, 400))}`)
    })

    it('should not validate when the validator is disabled', async () => {
      writePage('broken.html', '<html><body><p>no head, no lang</p></body></html>')

      const captured = await captureInit({ ...validatingConfig, htmlValidator: { enable: false } })

      assert.strictEqual(captured.includes('HTML validation error'), false)
    })
  })
})
