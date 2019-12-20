/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const klawsync = require('klaw-sync')
const path = require('path')

describe('JS Bundler Tests', function () {
  // sample JS source strings to test the compiler with
  const fileA = `var x, y, z
  x = 5
  y = 6
  z = x + y`
  const fileB = `function sayingHello(name) {
    console.log('Hello ' + name)
  }`
  const fileC = `function calculateSalary(weeks) {
    return weeks * 40 * 18
  }`
  // path to the directory of the test app
  const appDir = path.join(__dirname, 'app/jsBundlerTest')
  // array of paths to the generated static JS files
  const arrayOfPathsToStaticJS = [
    path.join(appDir, 'statics/js/a.js'),
    path.join(appDir, 'statics/js/b.js'),
    path.join(appDir, 'statics/js/c.js')
  ]
  // array of the sample JS source string
  const arrayOfStaticJS = [
    fileA,
    fileB,
    fileC
  ]
  // array of path to compiled bundled files
  const arrayOfBundleJSFilesPaths = [
    path.join(appDir, 'statics/js/.bundled/bundle.js')
  ]
  // path to where the bundle js files should be
  const pathOfBundleJSFolder = path.join(appDir, 'statics/js/.bundled')

  // options to pass into generateTestApp
  const options = { rooseveltPath: '../../../roosevelt', method: 'initServer', stopServer: true }

  beforeEach(function () {
    // start by generating the directory to hold the static js files
    fs.ensureDirSync(path.join(appDir, 'statics/js'))
    // generate sample js files into statics by looping through array of sample JS source strings
    for (let x = 0; x < arrayOfPathsToStaticJS.length; x++) {
      fs.writeFileSync(arrayOfPathsToStaticJS[x], arrayOfStaticJS[x])
    }
  })

  // clean up the test app directory after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should bundle the files together into one file', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // create a fork of the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test that the folder for bundled js exist, is in the right place, and has a outputfile of bundle.js
    testApp.on('message', () => {
      const pathOfBundleJSFolder = path.join(appDir, 'statics/js/.bundled')
      const arrayOfFiles = klawsync(pathOfBundleJSFolder)
      arrayOfFiles.forEach((file) => {
        const test = arrayOfBundleJSFilesPaths.includes(file.path)
        assert.strictEqual(test, true)
      })
      testApp.kill('SIGINT')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should bundle the js file if the env variable in the bundle parameter and the enviroment the app is run in is the same', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              env: 'dev',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // create a fork of the app.js file and run it as a child process in development mode
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test that the folder for bundled js exist, is in the right place, and has a outputfile of bundle.js
    testApp.on('message', () => {
      const arrayOfFiles = klawsync(pathOfBundleJSFolder)
      arrayOfFiles.forEach((file) => {
        const test = arrayOfBundleJSFilesPaths.includes(file.path)
        assert.strictEqual(test, true)
      })
      testApp.kill('SIGINT')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not bundle the js files if the enviroment parameter is set to one mode, but the app is started in the other mode', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              env: 'dev',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // create a fork of the app.js file and run it as a child process in production
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // test the path of the bundle JS folder and check if there are any files there. (should be zero)
    testApp.on('message', () => {
      const arrayOfFiles = klawsync(pathOfBundleJSFolder)
      const test = arrayOfFiles.length
      assert.strictEqual(test, 0)
      testApp.kill('SIGINT')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the output folder name to what is specified in the parameters and pass the folder to the js build folder if expose is true', function (done) {
    // array of path to altered bundle JS folder
    const arrayOfalteredBundleJSFolder = [
      path.join(appDir, 'statics/js/bundleJSTest'),
      path.join(appDir, 'statics/.build/js/bundleJSTest')
    ]
    // array of path to the bundle js file in the altered sourcePath
    const arrayOfAlteredSDBundleJSFilesPaths = [
      path.join(appDir, 'statics/js/bundleJSTest/bundle.js')
    ]
    // array of path to the bundle js file in altered build folder
    const arrayOfAlteredBuildBundleJSFilesPaths = [
      path.join(appDir, 'statics/.build/js/bundleJSTest/bundle.js')
    ]

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        output: '.build/js',
        bundler: {
          expose: true,
          output: 'bundleJSTest',
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.on('message', (params) => {
      // check to see that the output directory was changed to what was put into the directory and that the bundle file is there
      const arrayOfFiles = klawsync(arrayOfalteredBundleJSFolder[0])
      arrayOfFiles.forEach((file) => {
        const test = arrayOfAlteredSDBundleJSFilesPaths.includes(file.path)
        assert.strictEqual(test, true)
      })

      // check to see that the output directory was also made in the build folder and also has the bundle file there as well
      const arrayOfFiles2 = klawsync(arrayOfalteredBundleJSFolder[1])
      arrayOfFiles2.forEach((file) => {
        const test = arrayOfAlteredBuildBundleJSFilesPaths.includes(file.path)
        assert.strictEqual(test, true)
      })
      testApp.kill('SIGINT')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not try to make a js bundle output in the build directory since expose is false', function (done) {
    // var that holds the path to the build js bundle output bundle directory
    const pathToBuildBundleDir = path.join(appDir, 'statics/.build/js/.bundled')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        output: '.build/js',
        bundler: {
          expose: false,
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app is done with its initialization, test to see if the js bundle output directory is there or not
    testApp.on('message', (params) => {
      // check to see that the js bundle output is in the build directory or not
      const test = fs.existsSync(pathToBuildBundleDir)
      assert.strictEqual(test, false)
      testApp.kill('SIGINT')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a js bundle output directory in the build if one alreadly exists there', function (done) {
    // bool var to hold whether or not the build js bundle output bundle directory is being made by roosevel
    let jsbundleBuildDirCreatedBool = false

    // make the build js bundle output bundle directory
    const dir1Path = path.join(appDir, 'statics/.build')
    fs.mkdirsSync(dir1Path)
    const dir2Path = path.join(dir1Path, 'js')
    fs.mkdirsSync(dir2Path)
    const dir3Path = path.join(dir2Path, '.bundled')
    fs.mkdirsSync(dir3Path)
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        output: '.build/js',
        bundler: {
          expose: true,
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app logs output, see if it makes the js bundle output directory in the builds folder
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics/.build/js/.bundled')}`)) {
        jsbundleBuildDirCreatedBool = true
      }
    })

    // when the app is done with its initialization, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(jsbundleBuildDirCreatedBool, false, 'Roosevelt made a js bundle output directory in the build folder even though one exists there alreadly')
      done()
    })
  })

  it('should not make a js bundled output directory if generateFolderStructure is false', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              env: 'dev',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app is done its initialization, see if the folder was made
    testApp.on('message', () => {
      const test = fs.existsSync(pathOfBundleJSFolder)
      assert.strictEqual(test, false)
      testApp.kill('SIGINT')
    })

    // when the app is finished, check to see if the js bundle was made or not
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a js bundled output directory if one alreadly exists', function (done) {
    // bool var to hold whether or not the jsbundle output directory was made or not
    let jsbundleDirCreatedBool = false
    // make the js bundle output folder
    const dir1Path = path.join(appDir, 'statics/js')
    fs.mkdirsSync(dir1Path)
    const dir2Path = path.join(dir1Path, '.bundled')
    fs.mkdirsSync(dir2Path)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              env: 'dev',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the log output, check to see if the directory was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${pathOfBundleJSFolder}`)) {
        jsbundleDirCreatedBool = true
      }
    })

    // when the app is done its initialization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is finished, check to see if the js bundle was made or not
    testApp.on('exit', () => {
      assert.strictEqual(jsbundleDirCreatedBool, false, 'Roosevelt made a js bundle output directory when it shouldn\'t as generateFolderStructure is false')
      done()
    })
  })

  it('should throw an error if there is something wrong with the syntax of the js source file', function (done) {
    // bool var to hold whether or not the incorrect syntax error was produced
    let incorrectSyntaxErrorBool = false
    // js source string of incorrect syntax
    const jsSourceString = 'function test() {'
    // make the js file in the static folder
    fs.writeFileSync(path.join(appDir, 'statics/js/d.js'), jsSourceString)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js',
                'd.js'
              ]
            }
          ]
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error logs, see if the app logs the syntax error
    testApp.stderr.on('data', (data) => {
      if (data.includes('due to syntax errors in the source JavaScript')) {
        incorrectSyntaxErrorBool = true
      }
    })

    // the app should not have finished initialization
    testApp.on('message', (params) => {
      assert.fail('the app was able to finish initialization')
      testApp.kill('SIGINT')
    })

    // test that the file was not generated by Roosevelt
    testApp.on('exit', () => {
      assert.strictEqual(incorrectSyntaxErrorBool, true, 'Roosevelt did not catch that the js source file has a syntax error with it')
      done()
    })
  })

  it('should be able to pass an array of paths that will help broswerify with linking required modules to where they are', function (done) {
    // Separate test app options for this test
    const options2 = { rooseveltPath: '../../../roosevelt', method: 'initServer' }
    // bool var to hold whether a Hello was given from one of the scripts
    let consolLogHelloBool = false
    // create 2 more files, one that is a module, and one that uses the module
    const js1SourceCode = `function sayHello() {console.log('Hello')}
    module.exports.sayHello = sayHello`
    const js2SourceCode = `const greeting = require('greeting')
    greeting.sayHello()`
    // write one in the static js folder, and the other to a separate folder for this test
    fs.mkdirSync(path.join(appDir, 'statics/module'))
    fs.writeFileSync(path.join(appDir, 'statics/module/greeting.js'), js1SourceCode)
    fs.writeFileSync(path.join(appDir, 'statics/js/salutation.js'), js2SourceCode)

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              params: {
                paths: [
                  '/statics/module'
                ]
              },
              files: [
                'a.js',
                'b.js',
                'c.js',
                'salutation.js'
              ]
            }
          ]
        }
      }
    }, options2)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server starts, run the bundle script which should say hello based on its module requirements and how it uses it
    testApp.on('message', () => {
      const testApp2 = fork(path.join(appDir, 'statics/js/.bundled/bundle.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

      // check console logs for the 'Hello'
      testApp2.stdout.on('data', (data) => {
        if (data.includes('Hello')) {
          consolLogHelloBool = true
        }
      })

      // on exit of the 2nd app, see if the hello was given
      testApp2.on('exit', () => {
        assert.strictEqual(consolLogHelloBool, true, 'the paths param could not find the module script')
        done()
      })
    })
  })

  it('should not make the bundled js file if generateFolderStructure is false', function (done) {
    // bool var to hold whether or not Roosevelt made the bundled file
    let jsBundledOutputFileBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      js: {
        bundler: {
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console log, check to see if the outputfile was written
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new JS file ${path.join(appDir, 'statics/js/.bundled/bundle.js')}`)) {
        jsBundledOutputFileBool = true
      }
    })

    // when the app finishes initailization, make sure that the file is not made
    testApp.on('message', () => {
      const test = fs.existsSync(path.join(appDir, 'statics/js/.bundled/bundle.js'))
      assert.strictEqual(test, false)
      testApp.kill('SIGINT')
    })

    // when the app is about to end, check whether or not the file was made by roosevelt
    testApp.on('exit', () => {
      assert.strictEqual(jsBundledOutputFileBool, false, 'Roosevelt made the js output bundled file even though generateFolderStructure is false')
      done()
    })
  })

  it('should not make the bundled js file in the build folder if generateFolderStructure is false', function (done) {
    // bool var to hold whether or not Roosevelt made the bundled file
    let jsBundledOutputFileBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      js: {
        bundler: {
          expose: true,
          bundles: [
            {
              outputFile: 'bundle.js',
              files: [
                'a.js',
                'b.js',
                'c.js'
              ]
            }
          ]
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console log, check to see if the outputfile was written
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new JS file ${path.join(appDir, 'statics/.build/js/.bundled/bundle.js')}`)) {
        jsBundledOutputFileBool = true
      }
    })

    // when the app finishes initailization, check to make sure that the file was not made
    testApp.on('message', () => {
      const test = fs.existsSync(path.join(appDir, 'statics/.build/js/.bundled/bundle.js'))
      assert.strictEqual(test, false)
      testApp.kill('SIGINT')
    })

    // when the app is about to end, check whether or not the file was made by roosevelt
    testApp.on('exit', () => {
      assert.strictEqual(jsBundledOutputFileBool, false, 'Roosevelt made the js output bundled file even though generateFolderStructure is false')
      done()
    })
  })
})
