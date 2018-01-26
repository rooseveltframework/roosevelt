/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const generateTestApp = require('../util/generateTestApp')
const fork = require('child_process').fork

describe('Roosevelt UglifyJS Section Test', function () {
  // location of the test app
  const appDir = path.join(__dirname, '../app/uglifyJSTest')

  // sample JS source string to test the compiler with
  const test1 = `var a = function() { return 1 + 2}`

  // sample JS source string to test the compiler with that has a unusedvar
  const test2 = `function f(){ var u; return 2 + 3; }`

  // JS string that represents the js file that was compiled with no params set
  const noParamResult = 'var a=function(){return 3};'

  // path to where the file with the JS source string written on it will be
  const pathOfStaticJS = path.join(appDir, 'statics', 'js', 'a.js')

  // path to where the compiled js file will be written to
  const pathOfcompiledJS = path.join(appDir, 'statics', '.build', 'js', 'a.js')

  // variable to keep track of what test the program is on
  let testCount = 0

  beforeEach(function () {
    // increment the testCount
    testCount++
    // check to see that the suite has not passed the 2nd test yet
    if (testCount < 2) {
      // start by generating a statics folder in the roosevelt test app directory
      fse.ensureDirSync(path.join(appDir, 'statics', 'js'))
      // generate sample js files in statics with JS source string from test1
      fs.writeFileSync(pathOfStaticJS, test1)
    } else {
      // start by generating a statics folder in the roosevelt test app directory
      fse.ensureDirSync(path.join(appDir, 'statics', 'js'))
      // generate sample js files in statics with JS source string from test2
      fs.writeFileSync(pathOfStaticJS, test2)
    }
  })

  afterEach(function (done) {
    // delete the generated test folder once we are done so that we do not have conflicting data
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should make a compiled js file that is the same as the compiled js string I have stored in the noParamResult variable', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {
          }
        }
      }
    }, 'initServer')

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // grab the string data from the compiled js file and compare that to the string of what a normal uglified looks like
    testApp.on('message', () => {
      let contentsOfCompiledJS = fs.readFileSync(pathOfcompiledJS, 'utf8')
      let test = contentsOfCompiledJS === noParamResult
      assert.equal(test, true)
      testApp.kill()
      done()
    })
  })

  it('should make a different compiled js file if a param is passed to UglifyJS', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {
            compress: false
          }
        }
      }
    }, 'initServer')

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // grab the string data from the compiled js file and compare that to the string of what a normal uglified looks like
    testApp.on('message', (app) => {
      let contentsOfCompiledJS = fs.readFileSync(pathOfcompiledJS, 'utf8')
      let test = contentsOfCompiledJS === noParamResult
      assert.equal(test, false)
      testApp.kill()
      done()
    })
  })

  it('should console log a "warnings" string if there is something wrong with the code that the program is trying to parse', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: true,
          params: {
          }
        }
      }
    }, 'initServer')

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // an error should be thrown by the testApp, with a warnings in the string
    testApp.stderr.on('data', (data) => {
      if (data.toString().includes('Warnings')) {
        testApp.kill()
        done()
      }
    })

    // It should not be able to complete initialization, meaning if it does, we have an error in the error handling
    testApp.on('message', (params) => {
      assert.fail('app was able to complete initialize and did not throw a warnings error')
      testApp.kill()
      done()
    })
  })
})
