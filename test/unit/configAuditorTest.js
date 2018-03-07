/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')

describe('Roosevelt config Auditor Test', function () {
  // path to the Test App Directory
  const appDir = path.join(__dirname, '../', '/app', '/configAuditorTest')

  // options to add to the generateTestApp function
  const options = {rooseveltPath: '../../../roosevelt', method: 'startServer'}

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should be able to scan the package.json file in the test App Directory and tell me which params are missing from it', function (done) {
    // bool vars to hold whether or not the right logs and errors are being outputted
    let startingConfigAuditBool = false
    let modelsPathMissingBool = false
    let viewsPathMissingBool = false
    let controllersPathMissingBool = false
    let error1Bool = false
    let error2Bool = false

    // write the package.json file
    fse.ensureDir(path.join(appDir))
    fse.copyFileSync(path.join(appDir, '../', '../', 'util', 'configAuditpackage1.json'), path.join(appDir, 'package.json'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      onServerStart: `(app) => {process.send("something")}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // look at the logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting roosevelt user configuration audit...')) {
        startingConfigAuditBool = true
      }
    })

    // look at the errors
    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "modelsPath"!')) {
        modelsPathMissingBool = true
      }
      if (data.includes('Missing param "viewsPath"!')) {
        viewsPathMissingBool = true
      }
      if (data.includes('Missing param "controllersPath"!')) {
        controllersPathMissingBool = true
      }
      if (data.includes('Issues have been detected in roosevelt config')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      assert.equal(startingConfigAuditBool, true, 'Roosevelt did not start the configAuditor')
      assert.equal(modelsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a models path value')
      assert.equal(viewsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a views path value')
      assert.equal(controllersPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a controllers path value')
      assert.equal(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.equal(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      done()
    })
  })
})
