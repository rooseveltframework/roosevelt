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
  const test1 = 'var a = 7'
  const test2 = 'var b = "turkey"'
  const test3 = 'var c = true'
  let staticDirname = 'js'
  let pathsOfStaticJS = [
    path.join(appDir, 'statics', 'js', 'a.js'),
    path.join(appDir, 'statics', 'js', 'b.js'),
    path.join(appDir, 'statics', 'js', 'c.js')
  ]
  let pathsOfCompiledJS = [
    path.join(appDir, 'statics', '.build', 'js', 'a.js'),
    path.join(appDir, 'statics', '.build', 'js', 'b.js'),
    path.join(appDir, 'statics', '.build', 'js', 'c.js')
  ]
  let staticJSFiles = [
    test1,
    test2,
    test3
  ]

  // function to compile the static folder and files
  let generateStaticFolder = () => {
  // make sure the static js directory is there
    fse.ensureDirSync(path.join(appDir, 'statics', `${staticDirname}`))
  // write up the differnt files
    for (let x = 0; x < pathsOfStaticJS.length; x++) {
      fs.writeFileSync(pathsOfStaticJS[x], staticJSFiles[x])
    }
  }

  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should compile all static js files using roosevelt-uglify', function (done) {
    generateStaticFolder()
    // create and init the app
    // create and init the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      },
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        whitelist: []
      }
    }, 'initServer')
    // create a fork of it and run it
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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

  it('should be able to switch the name of the sourceDir to the one in the params', function (done) {
    // switch name of static source dir
    pathsOfStaticJS = [
      path.join(appDir, 'statics', 'jsStaticTest', 'a.js'),
      path.join(appDir, 'statics', 'jsStaticTest', 'b.js'),
      path.join(appDir, 'statics', 'jsStaticTest', 'c.js')
    ]
    staticDirname = 'jsStaticTest'
    generateStaticFolder()
    // create and init the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      },
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        output: '.build/js',
        sourceDir: 'jsStaticTest',
        whitelist: []
      }
    }, 'initServer')
    // create a fork of it and run it
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})
    testApp.on('message', () => {
      // test to see if their is the changed static file in the app and if all the files were written correctly
      const changedStaticJS = path.join(appDir, 'statics', 'jsStaticTest')
      const changedStaticJSArray = klawSync(changedStaticJS)
      changedStaticJSArray.forEach((file) => {
        let test = pathsOfStaticJS.includes(file.path)
        assert.equal(test, true)
      })
    // test to see if the default source Dir was made or not
      const regularStaticJSDir = path.join(appDir, 'statics', 'js')
      assert.equal(fs.existsSync(regularStaticJSDir), false)
      testApp.kill()
      done()
    })
  })

  it('should only compile files that are whitelisted', function (done) {
    // return everything back to what it was before
    pathsOfStaticJS = [
      path.join(appDir, 'statics', 'js', 'a.js'),
      path.join(appDir, 'statics', 'js', 'b.js'),
      path.join(appDir, 'statics', 'js', 'c.js')
    ]
    staticDirname = 'js'
    generateStaticFolder()
    // make a new array to compare the test files too
    let pathOfWhiteListedFiles = [
      path.join(appDir, 'statics', '.build', 'js', 'a.js')
    ]
    // create and init the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      },
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        output: '.build/js',
        sourceDir: 'js',
        whitelist: ['a.js']
      }
    }, 'initServer')
    // create a fork of it and run it
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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

  it.skip('should minify all files except for those that are blacklisted', function (done) {
    // change the data that would be put into the static files
    staticJSFiles[0] = `var a = function() { return 1 + 2}`
    staticJSFiles[1] = `var b = function(multin) { return multin * 4}`
    staticJSFiles[2] = `var c = function(name) {console.log("Hello " + name)}`

    generateStaticFolder()
    // get the buffer of the static files
    let staticJSFilesA = fs.readFileSync(pathsOfStaticJS[0], 'utf8')
    let staticJSFilesB = fs.readFileSync(pathsOfStaticJS[1], 'utf8')
    let staticJSFilesC = fs.readFileSync(pathsOfStaticJS[2], 'utf8')

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      },
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        output: '.build/js',
        sourceDir: 'js',
        whitelist: [],
        blacklist: ['c.js']
      }
    }, 'initServer')

    // create a fork of it and run it
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // grab all the compiled file's info
      let compiledJSFilesA = fs.readFileSync(pathsOfCompiledJS[0], 'utf8')
      let compiledJSFilesB = fs.readFileSync(pathsOfCompiledJS[1], 'utf8')
      let compiledJSFilesC = fs.readFileSync(pathsOfCompiledJS[2], 'utf8')
      // see if the buffer from the compiled is the same as their static counterpart
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
    // make everything back to normal
    staticJSFiles[0] = 'var a = 7'
    staticJSFiles[1] = 'var b = "turkey"'
    staticJSFiles[2] = 'var c = true'
    generateStaticFolder()

    pathsOfCompiledJS = [
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'a.js'),
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'b.js'),
      path.join(appDir, 'statics', '.build', 'jsCompiledTest', 'c.js')
    ]

    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: true,
        rooseveltWarnings: true
      },
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        output: '.build/jsCompiledTest',
        sourceDir: 'js',
        whitelist: []
      }
    }, 'initServer')

    // create a fork of it and run it
    const testApp = fork(path.join(appDir, 'app.js'), ['-prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      const compiledJS = path.join(path.join(appDir, 'statics', '.build', 'jsCompiledTest'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
      done()
    })
  })
})
