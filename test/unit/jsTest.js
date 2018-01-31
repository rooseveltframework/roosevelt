/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const generateTestApp = require('../util/generateTestApp')
const klawSync = require('klaw-sync')
const fork = require('child_process').fork

describe('JavaScript Section Test', function () {
  const appDir = path.join(__dirname, '../app/jsTest')

  // sample JS source string to test the compiler with
  const test1 = `var a = function() { return 1 + 2}`
  const test2 = `var b = function(multin) { return multin * 4}`
  const test3 = `var c = function(name) {console.log("Hello " + name)}`

  // array of paths to generated static js test files
  let pathsOfStaticJS = [
    path.join(appDir, 'statics', 'js', 'a.js'),
    path.join(appDir, 'statics', 'js', 'b.js'),
    path.join(appDir, 'statics', 'js', 'c.js')
  ]
  // array of paths to generated compiled js test files
  let pathsOfCompiledJS = [
    path.join(appDir, 'statics', '.build', 'js', 'a.js'),
    path.join(appDir, 'statics', '.build', 'js', 'b.js'),
    path.join(appDir, 'statics', '.build', 'js', 'c.js')
  ]
  // array to hold sample JS string data that will be written to a file
  let staticJSFiles = [
    test1,
    test2,
    test3
  ]

  beforeEach(function () {
    // start by generating a statics folder in the roosevelt test app directory
    fse.ensureDirSync(path.join(appDir, 'statics', 'js'))
    // generate sample js files in statics by looping through smaple JS source strings
    for (let x = 0; x < pathsOfStaticJS.length; x++) {
      fs.writeFileSync(pathsOfStaticJS[x], staticJSFiles[x])
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

  it('should compile all static js files using roosevelt-uglify', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, '../../../roosevelt', 'initServer')

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // look into the .build folder to see if all the files were compiled and if there is any extras
      const compiledJS = path.join(path.join(appDir, 'statics', '.build', 'js'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
      done()
    })
  })

  it('should only compile files that are whitelisted', function (done) {
    //  array that holds the paths for the generated whitelist compiled files
    let pathOfWhiteListedFiles = [
      path.join(appDir, 'statics', '.build', 'js', 'a.js'),
      path.join(appDir, 'statics', '.build', 'js', 'c.js')
    ]
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        whitelist: ['a.js', 'c.js']
      }
    }, '../../../roosevelt', 'initServer')
    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // test to see that only the whitelisted file was compiled
      const compiledJS = path.join(path.join(appDir, 'statics', '.build', 'js'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathOfWhiteListedFiles.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
      done()
    })
  })

  it('should minify all files except for those that are blacklisted', function (done) {
    // get the buffer(string data) of the static files
    let staticJSFilesA = fs.readFileSync(pathsOfStaticJS[0], 'utf8')
    let staticJSFilesB = fs.readFileSync(pathsOfStaticJS[1], 'utf8')
    let staticJSFilesC = fs.readFileSync(pathsOfStaticJS[2], 'utf8')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        blacklist: ['c.js']
      }
    }, '../../../roosevelt', 'initServer')

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // get the buffer(string data) of the compiled files
      let compiledJSFilesA = fs.readFileSync(pathsOfCompiledJS[0], 'utf8')
      let compiledJSFilesB = fs.readFileSync(pathsOfCompiledJS[1], 'utf8')
      let compiledJSFilesC = fs.readFileSync(pathsOfCompiledJS[2], 'utf8')
      // test if the buffer from the compiled is the same as their static counterpart
      let test1 = staticJSFilesA === compiledJSFilesA
      let test2 = staticJSFilesB === compiledJSFilesB
      let test3 = staticJSFilesC === compiledJSFilesC
      assert.equal(test1, false)
      assert.equal(test2, false)
      assert.equal(test3, true)
      testApp.kill()
      done()
    })
  })

  it('should make the output compiled folder with the new name and put all the compiled JS in it', function (done) {
    // array of paths to generated compile js files inside the altered output directory
    let pathsOfAlteredCompiledJS = [
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'a.js'),
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'b.js'),
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'c.js')
    ]

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        output: '.build/jsCompiledTest'
      }
    }, '../../../roosevelt', 'initServer')

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // test to see if the folder exist and if the compiled files are there with no extras
      const compiledJS = path.join(path.join(appDir, 'statics', '.build', 'jsCompiledTest'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfAlteredCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
      done()
    })
  })

  it('should make the compiled whitelist file take the name of the delimiter that is passed into it', function (done) {
    // array that holds the path of the delimiter file
    let delimiterOutputArray = [
      path.join(appDir, 'statics', '.build', 'js', 'test', 'something.js')
    ]
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        whitelist: ['a.js:test/something.js']
      }
    }, '../../../roosevelt', 'initServer')

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // grab the folder of where the output should be and check inside it to see if only the whitelist file was compiled and named appropriately
      let pathOfCompiledDLJS = path.join(appDir, 'statics', '.build', 'js', 'test')
      let CompiledDLJSArray = klawSync(pathOfCompiledDLJS)
      CompiledDLJSArray.forEach((file) => {
        let test = delimiterOutputArray.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
      done()
    })
  })

  it('should copy over the JS files to build without changing them when the noMinify param is true', function (done) {
    // get the buffer (string data) of the static files
    let staticJSFilesA = fs.readFileSync(pathsOfStaticJS[0], 'utf8')
    let staticJSFilesB = fs.readFileSync(pathsOfStaticJS[1], 'utf8')
    let staticJSFilesC = fs.readFileSync(pathsOfStaticJS[2], 'utf8')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      noMinify: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, '../../../roosevelt', 'initServer')

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // get the buffer (string data) of the compiled files
      let compiledJSFilesA = fs.readFileSync(pathsOfCompiledJS[0], 'utf8')
      let compiledJSFilesB = fs.readFileSync(pathsOfCompiledJS[1], 'utf8')
      let compiledJSFilesC = fs.readFileSync(pathsOfCompiledJS[2], 'utf8')
      // make tests to compare the buffer in between the static and compiled files
      let test1 = staticJSFilesA === compiledJSFilesA
      let test2 = staticJSFilesB === compiledJSFilesB
      let test3 = staticJSFilesC === compiledJSFilesC
      // test these comparisons
      assert.equal(test1, true)
      assert.equal(test2, true)
      assert.equal(test3, true)
      testApp.kill()
      done()
    })
  })
})
