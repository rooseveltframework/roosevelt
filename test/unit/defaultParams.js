/* eslint-env mocha */

const assert = require('assert')
const path = require('path')

describe('Parameter Loading Tests', function () {
  const sampleJSON = {
    port: 43711,
    checkDependencies: true,
    cores: 1,
    shutdownTimeout: 30000,
    cleanTimer: 604800000,
    js: {
      sourcePath: 'js',
      compiler: 'none',
      whitelist: null,
      blacklist: null,
      output: '.build/js',
      symlinkToPublic: true,
      bundler: {
        bundles: [],
        output: '.bundled',
        expose: true
      }
    }
  }
  const params = Object.keys(sampleJSON)
  let app

  before(function () {
    app = require('../../roosevelt')({
      appDir: path.join(__dirname, '../app/defaultParams'),
      logging: {
        methods: {
          http: false,
          info: false,
          warn: false
        }
      }
    })
  })

  params.forEach((param) => {
    if (param !== 'logging' && param !== 'generateFolderStructure' && param !== 'staticsSymlinksToPublic' && param !== 'htmlValidator') {
      it(`should set correct default for param "${param}"`, function () {
        assert.deepStrictEqual(app.expressApp.get('params')[param], sampleJSON[param])
      })
    }
  })
})
