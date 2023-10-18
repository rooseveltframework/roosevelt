/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const request = require('supertest')
const roosevelt = require('../roosevelt')

/**
 * Check if a directory is empty
 * @param {string} dir - directory to check
 * @returns {boolean}
 */
function isEmpty (dir) {
  const files = fs.readdirSync(dir)

  if (files.length === 0) {
    return true
  } else {
    return false
  }
}

const appDir = path.join(__dirname, 'app/multipartForms')

// Ensure the default paths are relative to appDir
const destDir = process.env.DEST_DIR || path.join(appDir, 'complete')

describe('multipart/formidable', () => {
  const context = {}
  const tmpDir = path.join(appDir, 'tmp')
  const completeDir = path.join(appDir, 'complete')

  before(done => {
    // generate tmp dir for file uploads
    fs.ensureDirSync(tmpDir)

    // generate dir for completed file uploads
    fs.ensureDirSync(completeDir)

    // spin up the roosevelt app
    roosevelt({
      appDir,
      makeBuildArtifacts: true,
      port: 40003,
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
          for (const key in files) {
            const file = files[key]
            const filePath = file[0].filepath
            const originalFilename = file[0].originalFilename
            const destPath = path.join(destDir, originalFilename)

            if (typeof filePath === 'string') {
              try {
                fs.moveSync(filePath, destPath)
              } catch (error) {
                console.error(`Error moving file: ${error}`)
              }
            }
          }

          // send a response
          res.status(200).send('done')
        })
      },
      onServerStart: app => {
        // bind app to test context
        context.app = app

        done()
      }
    }).startServer()
  })

  afterEach(() => {
    // wipe out contents of 'complete' directory
    fs.emptyDirSync(completeDir)
  })

  after(done => {
    // stop the server
    context.app.httpServer.close(() => {
      // wipe out the app directory
      fs.removeSync(appDir)

      done()
    })
  })

  it('should handle an attached file in a post and cleanup tmp on end', done => {
    // generate a simple text buffer to post
    const testFile = Buffer.from('This is a cool test file')

    // send a post request with a single file attached
    request(context.app)
      .post('/multipart')
      .attach('test', testFile, { filename: 'test.txt' })
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        }
        // check the test file on the other side
        const text = fs.readFileSync(path.join(completeDir, 'test.txt'))
        assert(text, 'This is a cool test file')

        // check that tmp directory is empty
        const checkTmp = setInterval(() => {
          if (isEmpty(tmpDir)) {
            clearInterval(checkTmp)
            done()
          }
        }, 50)
      })
  })

  it('should handle multiple attached files in a single post', done => {
    // generate a simple text buffer to post
    const testFile = Buffer.from('This is a cool test file')
    const anotherTestFile = Buffer.from('This is another cool test file')

    // send a post request with multiple files attached
    request(context.app)
      .post('/multipart')
      .attach('test1', testFile, { filename: 'test1.txt' })
      .attach('test2', anotherTestFile, { filename: 'test2.txt' })
      .expect(200)
      .end((err, res) => {
        if (err) {
          throw err
        }
        // check the test files on the other side
        const text1 = fs.readFileSync(path.join(completeDir, 'test1.txt'))
        const text2 = fs.readFileSync(path.join(completeDir, 'test2.txt'))
        assert(text1, 'This is a cool test file')
        assert(text2, 'This is another cool test file')

        // check that tmp directory is empty
        const checkTmp = setInterval(() => {
          if (isEmpty(tmpDir)) {
            clearInterval(checkTmp)
            done()
          }
        }, 50)
      })
  })

  it('should fail post when fields sent are over configured limit', done => {
    // send a post with a bunch of fields
    request(context.app)
      .post('/multipart')
      .field('field', 1)
      .field('moreField', 2)
      .field('evenMoarField', 3)
      .expect(500)
      .end((err, res) => {
        if (err) {
          throw err
        }

        done()
      })
  })
})
