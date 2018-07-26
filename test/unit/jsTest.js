/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const klawSync = require('klaw-sync')
const path = require('path')
const uglify = require('uglify-js')

describe('JavaScript Tests', function () {
  const appDir = path.join(__dirname, '../app/jsTest')

  // sample JS source string to test the compiler with
  const test1 = `var a = function() { return 1 + 2}`
  const test2 = `var b = function(multin) { return multin * 4}`
  const test3 = `var c = function(name) {console.log("Hello " + name)}`

  // array of paths to generated static js test files
  let pathsOfStaticJS = [
    path.join(appDir, 'statics/js/a.js'),
    path.join(appDir, 'statics/js/b.js'),
    path.join(appDir, 'statics/js/c.js')
  ]
  // array of paths to generated compiled js test files
  let pathsOfCompiledJS = [
    path.join(appDir, 'statics/.build/js/a.js'),
    path.join(appDir, 'statics/.build/js/b.js'),
    path.join(appDir, 'statics/.build/js/c.js')
  ]
  // array to hold sample JS string data that will be written to a file
  let staticJSFiles = [
    test1,
    test2,
    test3
  ]

  // options to pass into generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'initServer', stopServer: true}

  beforeEach(function () {
    // start by generating a statics folder in the roosevelt test app directory
    fse.ensureDirSync(path.join(appDir, 'statics/js'))
    // generate sample js files in statics by looping through smaple JS source strings
    for (let x = 0; x < pathsOfStaticJS.length; x++) {
      fse.writeFileSync(pathsOfStaticJS[x], staticJSFiles[x])
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
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // look into the .build folder to see if all the files were compiled and if there is any extras
      const compiledJS = path.join(path.join(appDir, 'statics/.build/js'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should only compile files that are whitelisted', function (done) {
    //  array that holds the paths for the generated whitelist compiled files
    let pathOfWhiteListedFiles = [
      path.join(appDir, 'statics/.build/js/a.js'),
      path.join(appDir, 'statics/.build/js/c.js')
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
    }, options)
    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // test to see that only the whitelisted file was compiled
      const compiledJS = path.join(path.join(appDir, 'statics/.build/js'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathOfWhiteListedFiles.includes(file.path)
        assert.equal(test, true)
      })
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should minify all files except for those that are blacklisted', function (done) {
    // get the buffer(string data) of the static files
    let staticJSFilesA = fse.readFileSync(pathsOfStaticJS[0], 'utf8')
    let staticJSFilesB = fse.readFileSync(pathsOfStaticJS[1], 'utf8')
    let staticJSFilesC = fse.readFileSync(pathsOfStaticJS[2], 'utf8')

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
    }, options)

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // get the buffer(string data) of the compiled files
      let compiledJSFilesA = fse.readFileSync(pathsOfCompiledJS[0], 'utf8')
      let compiledJSFilesB = fse.readFileSync(pathsOfCompiledJS[1], 'utf8')
      let compiledJSFilesC = fse.readFileSync(pathsOfCompiledJS[2], 'utf8')
      // test if the buffer from the compiled is the same as their static counterpart
      let test1 = staticJSFilesA === compiledJSFilesA
      let test2 = staticJSFilesB === compiledJSFilesB
      let test3 = staticJSFilesC === compiledJSFilesC
      assert.equal(test1, false)
      assert.equal(test2, false)
      assert.equal(test3, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should make the output compiled folder with the new name and put all the compiled JS in it', function (done) {
    // array of paths to generated compile js files inside the altered output directory
    let pathsOfAlteredCompiledJS = [
      path.join(appDir, 'statics/.build/jsCompiledTest/a.js'),
      path.join(appDir, 'statics/.build/jsCompiledTest/b.js'),
      path.join(appDir, 'statics/.build/jsCompiledTest/c.js')
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
    }, options)

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // test to see if the folder exist and if the compiled files are there with no extras
      const compiledJS = path.join(path.join(appDir, 'statics/.build/jsCompiledTest'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfAlteredCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should make the compiled whitelist file take the name of the delimiter that is passed into it', function (done) {
    // array that holds the path of the delimiter file
    let delimiterOutputArray = [
      path.join(appDir, 'statics/.build/js/test/something.js')
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
    }, options)

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // grab the folder of where the output should be and check inside it to see if only the whitelist file was compiled and named appropriately
      let pathOfCompiledDLJS = path.join(appDir, 'statics/.build/js/test')
      let CompiledDLJSArray = klawSync(pathOfCompiledDLJS)
      CompiledDLJSArray.forEach((file) => {
        let test = delimiterOutputArray.includes(file.path)
        assert.equal(test, true)
      })
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should copy over the JS files to build without changing them when the noMinify param is true', function (done) {
    // get the buffer (string data) of the static files
    let staticJSFilesA = fse.readFileSync(pathsOfStaticJS[0], 'utf8')
    let staticJSFilesB = fse.readFileSync(pathsOfStaticJS[1], 'utf8')
    let staticJSFilesC = fse.readFileSync(pathsOfStaticJS[2], 'utf8')

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
    }, options)

    // create a fork of app.js and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', () => {
      // get the buffer (string data) of the compiled files
      let compiledJSFilesA = fse.readFileSync(pathsOfCompiledJS[0], 'utf8')
      let compiledJSFilesB = fse.readFileSync(pathsOfCompiledJS[1], 'utf8')
      let compiledJSFilesC = fse.readFileSync(pathsOfCompiledJS[2], 'utf8')
      // make tests to compare the buffer in between the static and compiled files
      let test1 = staticJSFilesA === compiledJSFilesA
      let test2 = staticJSFilesB === compiledJSFilesB
      let test3 = staticJSFilesC === compiledJSFilesC
      // test these comparisons
      assert.equal(test1, true)
      assert.equal(test2, true)
      assert.equal(test3, true)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it(`should throw a warning if the app's js compiler nodeModule is undefined`, function (done) {
    // bool var to hold whether or not the specific error message was given
    let failureToIncludeBool = false
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          showWarnings: true,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // catch for the specific error of the app failing to include js compiler
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to include your JS compiler!')) {
        failureToIncludeBool = true
      }
    })

    // exit the app when the app finishes initilization
    testApp.on('message', () => {
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      if (failureToIncludeBool === false) {
        assert.fail('The app did not catch that the error where nodeModule param for the js compiler is undefined')
      }
      done()
    })
  })

  it(`should throw a warning if the app's js compiler nodeModule is set to an incorrect or missing compiler`, function (done) {
    // bool var to hold whether or not the specific error message was given
    let failureToIncludeBool = false
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-jsCompiler',
          showWarnings: true,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // catch for the specific error of the app failing to include js compiler
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to include your JS compiler!')) {
        failureToIncludeBool = true
      }
    })

    // exit the app when the app finishes initilization
    testApp.on('message', () => {
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      if (failureToIncludeBool === false) {
        assert.fail('The app did not catch that the error where nodeModule param for the js compiler is undefined')
      }
      done()
    })
  })

  it('should give an error if there is a file named in the whitelist param that does not exists', function (done) {
    // bool var tha that shows whether or not the app had given the warning of a js file not existing
    let jsFileNotExistingBool = false
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        },
        whitelist: ['a.js', 'g.js']
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test the error log to see if we get an error that states that the file in the whitelist array does not exist
    testApp.stderr.on('data', (data) => {
      if (data.includes('specified in JS whitelist does not exist')) {
        jsFileNotExistingBool = true
      }
    })

    // the app should not be able to initialize if it has this specific whitelist error
    testApp.on('message', () => {
      assert.fail('app was able to initialize even though it should not have')
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      if (jsFileNotExistingBool === false) {
        assert.fail('Roosevelt did not catch that a file listed in the whitelist array does not exist.')
      }
      done()
    })
  })

  it('should give an error if if whitelist is not an array/object', function (done) {
    // bool var to hold whether or not the error about how the whitelist was not configured correctly was thrown
    let whitelistConfigureIncorrectlyBool = false
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
        whitelist: true
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test the error log to see if the specific error had been written
    testApp.stderr.on('data', (data) => {
      if (data.includes('JS whitelist not configured correctly')) {
        whitelistConfigureIncorrectlyBool = true
      }
    })

    // exit the app when it finished its initialization
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // on exit, check if the error was logged
    testApp.on('exit', () => {
      if (whitelistConfigureIncorrectlyBool === false) {
        assert.kill('Roosevelt did not catch that whitelist was assigned a value that is not an object')
      }
      done()
    })
  })

  it('should skip compiling a file if the path is a directory', function (done) {
    // make a directory inside the static js folder
    let filePathName = path.join(appDir, 'statics/js/testDir')
    fse.mkdirSync(filePathName)
    // generate the app.js file
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
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when server starts, see if a file or directory of testDir was made on the build
    testApp.on('message', () => {
      let testFilePath = path.join(appDir, 'statics/.build/js/testDir')
      let test = fse.existsSync(testFilePath)
      assert.equal(test, false)
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should throw an error stating that a file is not coded correctly', function (done) {
    // create a file that has js errors in it
    let fileContent = `console.log('blah'`
    let filePath = path.join(appDir, 'statics/js/error.js')
    fse.writeFileSync(filePath, fileContent)
    // bool var that holds whether or not Roosevelt will give a warning for a js file not coded correctly
    let fileCodedIncorrectlyBool = false

    // generate the app.js file
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
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the error logs to see if the specific error has popped up
    testApp.stderr.on('data', (data) => {
      if (data.includes('Please ensure that it is coded correctly')) {
        fileCodedIncorrectlyBool = true
      }
    })

    // the app should not be able to initialize if this specific error was thrown
    testApp.on('message', () => {
      assert.fail('app was able to initialize even though it should not have')
      testApp.send('stop')
    })

    // when the app is about to exit, check if the error was logged
    testApp.on('exit', () => {
      if (fileCodedIncorrectlyBool === false) {
        assert.fail('Roosevelt did not catch that a file was coded incorrectly')
      }
      done()
    })
  })

  it('should create the statics js directory if it does not exist at the point of compiling', function (done) {
    // get rid of the js folder that was copied over
    fse.removeSync(path.join(appDir, 'statics/js'))

    // bool var to check that a static js dir is being made
    let staticJSDirMadeBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        sourceDir: 'jsTestA',
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the output logs to see if the source dir was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics/jsTestA')}`)) {
        staticJSDirMadeBool = true
      }
    })

    // when app starts, end it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app ends, check to see if it created the static js folder
    testApp.on('exit', () => {
      if (staticJSDirMadeBool === false) {
        assert.fail(`Roosevelt did not create a static js directory when one wasn't present`)
      }
      done()
    })
  })

  it('should not try to make the js static folder if generatefolderstructure is false', function (done) {
    // get rid of the js folder that was copied over
    fse.removeSync(path.join(appDir, 'statics/js'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to end, check to see if the js static file was made or not
    testApp.on('exit', () => {
      // js static folder
      let test = fse.existsSync(path.join(appDir, 'statics/js'))
      assert.equal(test, false)
      done()
    })
  })

  it('should not try to make the build or js output static folder if generatefolderstructure is false', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to end, check to see if the build or js output folder were made
    testApp.on('exit', () => {
      // build folder
      let test = fse.existsSync(path.join(appDir, 'statics/.build'))
      assert.equal(test, false)
      // output folder
      let test2 = fse.existsSync(path.join(appDir, 'statics/.build/js'))
      assert.equal(test2, false)
      done()
    })
  })

  it('should not make the js compiled output directory if one alreadly exists', function (done) {
    // bool var to see if the js compiled output directory was made or not
    let jsOutputDirCreateBool = false
    // create the js compiled output directory
    let compiledpath = path.join(appDir, 'statics/.build')
    let compiledpath2 = path.join(appDir, 'statics/.build/jsBuildTest')
    fse.mkdirSync(compiledpath)
    fse.mkdirSync(compiledpath2)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        output: '.build/jsBuildTest',
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the logs to see if the js compiled output directory gets made or not
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics/.build/jsBuildTest')}`)) {
        jsOutputDirCreateBool = true
      }
    })

    // when app is done with its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when app is killed, check if the js compiled output directory was made by roosevelt
    testApp.on('exit', () => {
      if (jsOutputDirCreateBool) {
        assert.fail('Roosevelt made a folder for js output even when on existed alreadly')
      }
      done()
    })
  })

  it('should skip making a compile file to the build folder if another file of the same name is alreadly there', function (done) {
    // bool var to hold whether or not one of the files was compiled into the build folder
    let compiledFileMadeBool = false
    // make the compiled file using uglify
    let result = uglify.minify(test1, {})
    let newJs = result.code
    // write it to the compile file
    fse.ensureDirSync(path.join(appDir, 'statics/.build/js'))
    fse.writeFileSync(path.join(appDir, 'statics/.build/js', 'a.js'), newJs)

    // generate the app.js file
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
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on log output, check that Roosevelt does not log out that it had make a new a.js file in the js output folder
    testApp.stdout.on('data', (data) => {
      if (data.includes(`Roosevelt Express writing new JS file ${path.join(appDir, 'statics/.build/js/a.js')}`)) {
        compiledFileMadeBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is on the verge of exiting, check that the app had not written the file that alreadly exists
    testApp.on('exit', () => {
      if (compiledFileMadeBool) {
        assert.fail('Roosevelt had made a file even though a file with the same name alreadly exists in the build folder')
      }
      done()
    })
  })

  it('should throw an error if the node module passed in js compiler is not compatible or out of date with Roosevelt', function (done) {
    // bool var to hold whether or not the warning saying that the node module provided in js compiler does not works with Roosevelt was thrown
    let incompatibleParserWarnBool = false
    fse.outputFileSync(path.join(__dirname, '../../node_modules/test_module_1/index.js'), 'module.exports = function () {}')

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'test_module_1',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on error output, see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('Selected JS compiler module') && data.includes('out of date or incompatible with this version of Roosevelt')) {
        incompatibleParserWarnBool = true
      }
    })

    // the app should not be able to initailize with this specific error
    testApp.on('message', () => {
      assert.fail('app was able to initialize even though it should not have')
      testApp.send('stop')
    })

    // when the app is about to end, check that the error was hit
    testApp.on('exit', () => {
      fse.removeSync(path.join(__dirname, '../../node_modules/test_module_1'))
      if (incompatibleParserWarnBool === false) {
        assert.fail('Roosevelt did not catch that the node module provided into the js compiler is not compatible or is out of date')
      }
      done()
    })
  })

  it('should throw an error if the node module provided to the js compiler has a parse function but does not provide the functionality that is required from a js compiler', function (done) {
    // bool var to hold whether or not the warning saying that the node module provided in js compiler does not works with Roosevelt was thrown
    let incompatibleParserWarnBool = false
    fse.outputFileSync(path.join(__dirname, '../../node_modules/test_module_2/index.js'), 'let parse = function (arg1) { }\nmodule.exports.parse = parse')

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        compiler: {
          nodeModule: 'test_module_2',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on error output, see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('Selected JS compiler module') && data.includes('out of date or incompatible with this version of Roosevelt')) {
        incompatibleParserWarnBool = true
      }
    })

    // app should not be able to initialize with this specific error
    testApp.on('message', () => {
      assert.fail('app was able to initialize even though it should not have')
      testApp.send('stop')
    })

    // when the app is about to end, check that the error was hit
    testApp.on('exit', () => {
      fse.removeSync(path.join(__dirname, '../../node_modules/test_module_2'))
      if (incompatibleParserWarnBool === false) {
        assert.fail('Roosevelt did not catch that the node module provided into the js compiler is not compatible or is out of date')
      }
      done()
    })
  })

  it('should not allow the creation of any new js compiled files if the generateFolderStructure param is set to false', function (done) {
    // bool var is hold whether or not it was logged that the js compile files were made
    let compiledJSCreatedBool = false

    // create the three files
    fse.ensureFileSync(path.join(appDir, 'statics/.build/js/a.js'))
    fse.ensureFileSync(path.join(appDir, 'statics/.build/js/b.js'))
    fse.ensureFileSync(path.join(appDir, 'statics/.build/js/c.js'))

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      js: {
        compiler: {
          nodeModule: 'roosevelt-uglify',
          showWarnings: false,
          params: {}
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // check the logs to see if any of the compiled files were made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new JS file ${path.join(appDir, 'statics/.build/js/a.js')}`) || data.includes(`writing new JS file ${path.join(appDir, 'statics/.build/js/b.js')}`) || data.includes(`writing new JS file ${path.join(appDir, 'statics/.build/js/c.js')}`)) {
        compiledJSCreatedBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to end, see that the files were not made
    testApp.on('exit', () => {
      if (compiledJSCreatedBool) {
        assert.fail('Roosevelt overwritten the js compiled files even when generateFolderStructure is false')
      }
      done()
    })
  })
})
