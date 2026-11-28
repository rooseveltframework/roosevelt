const { describe, it, before, after, afterEach } = require('node:test')

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

/**
 * Wait until a directory is empty, failing if it is not by the deadline
 * @param {string} dir - directory to check
 * @param {number} timeout - how long to wait, in milliseconds
 */
async function waitUntilEmpty (dir, timeout = 5000) {
  const deadline = Date.now() + timeout
  while (fs.readdirSync(dir).length > 0) {
    if (Date.now() > deadline) assert.fail(`${dir} still holds ${fs.readdirSync(dir).join(', ')}`)
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

describe('multipart/formidable', () => {
  const appDir = path.join(__dirname, 'app/multipartForms')
  const context = {}
  const tmpDir = path.join(appDir, 'tmp')
  const completeDir = path.join(appDir, 'complete')

  before(async () => {
    // generate tmp dir for file uploads
    fs.ensureDirSync(tmpDir)

    // generate dir for completed file uploads
    fs.ensureDirSync(completeDir)

    // spin up the roosevelt app
    const rooseveltApp = roosevelt({
      appDir,
      makeBuildArtifacts: true,
      csrfProtection: false,
      expressSession: false,
      http: { port: 30112 },
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
      formidable: {
        uploadDir: tmpDir,
        multiples: false,
        maxFieldsSize: 2
      },
      onServerInit: app => {
        const router = app.get('router')

        router.route('/multipart').post((req, res) => {
          const files = req.files

          // move files to 'complete' directory
          for (const fileArray of Object.values(files)) {
            for (const file of fileArray) {
              const filePath = file.filepath
              const originalFilename = file.originalFilename
              const destPath = path.join(completeDir, originalFilename)

              if (typeof filePath === 'string') {
                try {
                  fs.moveSync(filePath, destPath)
                } catch (error) {
                  console.error(`Error moving file: ${error}`)
                }
              }
            }
          }

          // send a response
          res.status(200).send('done')
        })

        // a route that leaves its uploads where formidable put them, so that only roosevelt's own cleanup can remove them
        router.route('/leaveUploads').post((req, res) => {
          const uploaded = Object.values(req.files).flat().map(file => file.filepath)
          res.json({ uploaded, existed: uploaded.map(filePath => fs.existsSync(filePath)) })
        })
      }
    })

    await rooseveltApp.startServer()

    // bind app to test context
    context.app = rooseveltApp.expressApp
    context.instance = rooseveltApp
  })

  afterEach(() => {
    // wipe out contents of 'complete' directory
    fs.rmSync(completeDir, { recursive: true, force: true })
  })

  after(async () => {
    // stop the server, then wipe out the app directory
    await context.instance.stopServer({ persistProcess: true })
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('should handle an attached file in a post', async () => {
    // generate a simple text buffer to post
    const testFile = Buffer.from('This is a cool test file')

    // send a post request with a single file attached
    await request(context.app)
      .post('/multipart')
      .attach('test', testFile, { filename: 'test.txt' })
      .expect(200)

    // check the test file on the other side
    const text = fs.readFileSync(path.join(completeDir, 'test.txt'))
    assert.strictEqual(text.toString(), 'This is a cool test file')
  })

  it('should remove uploads the route left in tmp once the request ends', async () => {
    const res = await request(context.app)
      .post('/leaveUploads')
      .attach('test1', Buffer.from('This is a cool test file'), { filename: 'test1.txt' })
      .attach('test2', Buffer.from('This is another cool test file'), { filename: 'test2.txt' })
      .expect(200)

    // the uploads were in tmp while the route ran, so emptying it below is down to roosevelt's cleanup
    assert.strictEqual(res.body.uploaded.length, 2)
    assert.deepStrictEqual(res.body.existed, [true, true])
    for (const filePath of res.body.uploaded) assert.strictEqual(path.dirname(filePath), tmpDir)

    await waitUntilEmpty(tmpDir)
  })

  it('should handle a multipart content type written in capitals', async () => {
    // the form is written out by hand, since supertest would otherwise set its own lowercase content type
    const body = '--rooseveltTestBoundary\r\nContent-Disposition: form-data; name="test"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nThis is a cool test file\r\n--rooseveltTestBoundary--\r\n'
    const res = await request(context.app)
      .post('/leaveUploads')
      .set('Content-Type', 'MULTIPART/FORM-DATA; boundary=rooseveltTestBoundary')
      .send(Buffer.from(body))
      .expect(200)

    assert.strictEqual(res.body.uploaded.length, 1, 'the upload should have been parsed')
    await waitUntilEmpty(tmpDir)
  })

  it('should handle multiple attached files in a single post', async () => {
    // generate a simple text buffer to post
    const testFile = Buffer.from('This is a cool test file')
    const anotherTestFile = Buffer.from('This is another cool test file')

    // send a post request with multiple files attached
    await request(context.app)
      .post('/multipart')
      .attach('test1', testFile, { filename: 'test1.txt' })
      .attach('test2', anotherTestFile, { filename: 'test2.txt' })
      .expect(200)

    // check the test files on the other side
    const text1 = fs.readFileSync(path.join(completeDir, 'test1.txt'))
    const text2 = fs.readFileSync(path.join(completeDir, 'test2.txt'))
    assert.strictEqual(text1.toString(), 'This is a cool test file')
    assert.strictEqual(text2.toString(), 'This is another cool test file')
  })

  it('should fail post when fields sent are over configured limit', async () => {
    // send a post with a bunch of fields
    await request(context.app)
      .post('/multipart')
      .field('field', 1)
      .field('moreField', 2)
      .field('evenMoarField', 3)
      .expect(500)
  })
})
