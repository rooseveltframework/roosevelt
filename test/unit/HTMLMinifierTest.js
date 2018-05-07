/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const request = require('supertest')

describe('Roosevelt HTML minifier Section test', function () {
  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlMinifierTest')

  // options that would be put into generateTestApp params
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  // before each test, copy the mvc dir from util to the test app
  beforeEach(function (done) {
    fse.copySync(path.join(appDir, '../', '../', 'util', 'mvc'), path.join(appDir, 'mvc'))
    done()
  })

  // remove any of the finished test directories and files
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should minify the HTML use in teddy page with the default options', function (done) {
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      noMinify: false,
      viewEngine: [
        'html: teddy'
      ]
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/teddyTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
            testApp.kill('SIGINT')
          }
          let test1 = res.text.includes('<!DOCTYPE html><html lang=en><head>')
          let test2 = res.text.includes('<title>Teddy Test</title></head><body><h1>Heading Test</h1><p>This is the first sentence that I am grabbing from my teddy model</p>')
          assert.equal(test1, true, 'Roosevelt minifier did not minify a part of the HTML')
          assert.equal(test2, true, 'Roosevelt minifier did not minify a part of the HTML')
          testApp.kill('SIGINT')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should allow user to alter params to get differnt results from minified HTML', function (done) {
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      noMinify: false,
      htmlMinify: {
        htmlMinifier: {
          removeComments: false,
          collapseWhitespace: false,
          removeEmptyAttributes: false
        }
      },
      viewEngine: [
        'html: teddy'
      ]
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/teddyTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
            testApp.kill('SIGINT')
          }
          let test1 = res.text.includes('<!-- This is a test comment 1 -->')
          let test2 = res.text.includes('<!DOCTYPE html><html lang=en><head>')
          let test3 = res.text.includes('<p id=" ">')
          assert.equal(test1, true, 'Roosevelt minifier change its minifier option with what was given in params')
          assert.equal(test2, false, 'Roosevelt minifier change its minifier option with what was given in params')
          assert.equal(test3, true, 'Roosevelt minifier change its minifier option with what was given in params')
          testApp.kill('SIGINT')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should skip Minifying the HTML if noMinify is set to true', function (done) {
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      noMinify: true,
      viewEngine: [
        'html: teddy'
      ]
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/teddyTest')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err.message)
            testApp.kill('SIGINT')
          }
          let test1 = res.text.includes('<!-- This is a test comment 1 -->')
          let test2 = res.text.includes('<!DOCTYPE html><html lang=en><head>')
          let test3 = res.text.includes('<p id=" ">')
          assert.equal(test1, true, 'Roosevelt used its Minifier even though noMinify is set to true')
          assert.equal(test2, false, 'Roosevelt used its Minifier even though noMinify is set to true')
          assert.equal(test3, true, 'Roosevelt used its Minifier even though noMinify is set to true')
          testApp.kill('SIGINT')
        })
    })

    testApp.on('exit', () => {
      done()
    })
  })
})
