/* eslint-env mocha */

// const assert = require('assert')
const path = require('path')
// const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
// const fse = require('fs-extra')
// const request = require('supertest')
// const execa = require('execa')

describe('Roosevelt test with execa', function () {
  // location of the test app
  const appDir = path.join(__dirname, '../', 'app', '/htmlValidatorTest')

  // options that would be put into generateTestApp params
  // const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })
})
