/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fse = require('fs-extra')
const fs = require('fs')
const klawsync = require('klaw-sync')

describe('js Bundler Section Test', function () {
  // sample JS source strings to test the compiler with
  let fileA = `var x, y, z
  x = 5
  y = 6
  z = x + y`
  let fileB = `function sayingHello(name) {
    console.log('Hello ' + name)   
  }`
  let fileC = `function calculateSalary(weeks) {
    return weeks * 40 * 18
  }`
  // path to the directory of the test app
  const appDir = path.join(__dirname, '../', 'app', 'jsBundlerTest')
  // array of paths to the generated static JS files
  const arrayOfPathsToStaticJS = [
    path.join(appDir, 'statics', 'js', 'a.js'),
    path.join(appDir, 'statics', 'js', 'b.js'),
    path.join(appDir, 'statics', 'js', 'c.js')
  ]
  // array of the sample JS source string
  const arrayOfStaticJS = [
    fileA,
    fileB,
    fileC
  ]
   // array of path to compiled bundled files
  let arrayOfBundleJSFilesPaths = [
    path.join(appDir, 'statics', 'js', '.bundled', 'bundle.js')
  ]
  // path to where the bundle js files should be
  let pathOfBundleJSFolder = path.join(appDir, 'statics', 'js', '.bundled')

  // options to pass into generateTestApp
  let options = {rooseveltPath: '../../../roosevelt', method: 'initServer'}

  beforeEach(function () {
    // start by generating the directory to hold the static js files
    fse.ensureDirSync(path.join(appDir, 'statics', 'js'))
    // generate sample js files into statics by looping through array of sample JS source strings
    for (let x = 0; x < arrayOfPathsToStaticJS.length; x++) {
      fs.writeFileSync(arrayOfPathsToStaticJS[x], arrayOfStaticJS[x])
    }
  })

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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test that the folder for bundled js exist, is in the right place, and has a outputfile of bundle.js
    testApp.on('message', () => {
      let pathOfBundleJSFolder = path.join(appDir, 'statics', 'js', '.bundled')
      let arrayOfFiles = klawsync(pathOfBundleJSFolder)
      arrayOfFiles.forEach((file) => {
        let test = arrayOfBundleJSFilesPaths.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill('SIGINT')
    })

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
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test that the folder for bundled js exist, is in the right place, and has a outputfile of bundle.js
    testApp.on('message', () => {
      let arrayOfFiles = klawsync(pathOfBundleJSFolder)
      arrayOfFiles.forEach((file) => {
        let test = arrayOfBundleJSFilesPaths.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill('SIGINT')
    })

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
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test the path of the bundle JS folder and check if there are any files there. (should be zero)
    testApp.on('message', () => {
      let arrayOfFiles = klawsync(pathOfBundleJSFolder)
      let test = arrayOfFiles.length
      assert.equal(test, 0)
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should change the output folder name to what is specified in the parameters and pass the folder to the js build folder if expose is true', function (done) {
    // array of path to altered bundle JS folder
    let arrayOfalteredBundleJSFolder = [
      path.join(appDir, 'statics', 'js', 'bundleJSTest'),
      path.join(appDir, 'statics', '.build', 'js', 'bundleJSTest')
    ]
    // array of path to the bundle js file in the altered sourceDir
    let arrayOfAlteredSDBundleJSFilesPaths = [
      path.join(appDir, 'statics', 'js', 'bundleJSTest', 'bundle.js')
    ]
    // array of path to the bundle js file in altered build folder
    let arrayOfAlteredBuildBundleJSFilesPaths = [
      path.join(appDir, 'statics', '.build', 'js', 'bundleJSTest', 'bundle.js')
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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    testApp.on('message', (params) => {
      // check to see that the output directory was changed to what was put into the directory and that the bundle file is there
      let arrayOfFiles = klawsync(arrayOfalteredBundleJSFolder[0])
      arrayOfFiles.forEach((file) => {
        let test = arrayOfAlteredSDBundleJSFilesPaths.includes(file.path)
        assert.equal(test, true)
      })

      // check to see that the output directory was also made in the build folder and also has the bundle file there as well
      let arrayOfFiles2 = klawsync(arrayOfalteredBundleJSFolder[1])
      arrayOfFiles2.forEach((file) => {
        let test = arrayOfAlteredBuildBundleJSFilesPaths.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not try to make a js bundle output in the build directory since expose is false', function (done) {
    // var that holds the path to the build js bundle output bundle directory
    let pathToBuildBundleDir = path.join(appDir, 'statics', '.build', 'js', '.bundled')

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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app is done with its initialization, test to see if the js bundle output directory is there or not
    testApp.on('message', (params) => {
      // check to see that the js bundle output is in the build directory or not
      let test = fse.existsSync(pathToBuildBundleDir)
      assert.equal(test, false)
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a js bundle output directory in the build if one alreadly exists there', function (done) {
    // bool var to hold whether or not the build js bundle output bundle directory is being made by roosevel
    let jsbundleBuildDirCreatedBool = false

    // make the build js bundle output bundle directory
    let dir1Path = path.join(appDir, 'statics', '.build')
    fse.mkdirsSync(dir1Path)
    let dir2Path = path.join(dir1Path, 'js')
    fse.mkdirsSync(dir2Path)
    let dir3Path = path.join(dir2Path, '.bundled')
    fse.mkdirsSync(dir3Path)
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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app logs output, see if it makes the js bundle output directory in the builds folder
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics', '.build', 'js', '.bundled')}`)) {
        jsbundleBuildDirCreatedBool = true
      }
    })
    // when the app is done with its initialization, kill it
    testApp.on('message', (params) => {
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check to see if the js bundle output dir was made or not ]
    testApp.on('exit', () => {
      if (jsbundleBuildDirCreatedBool) {
        assert.fail('Roosevelt made a js bundle output directory in the build folder even though one exists there alreadly')
      }
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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the app is done its initialization, see if the folder was made
    testApp.on('message', () => {
      let test = fse.existsSync(pathOfBundleJSFolder)
      assert.equal(test, false)
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
    let dir1Path = path.join(appDir, 'statics', 'js')
    fse.mkdirsSync(dir1Path)
    let dir2Path = path.join(dir1Path, '.bundled')
    fse.mkdirsSync(dir2Path)

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
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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
      if (jsbundleDirCreatedBool) {
        assert.fail(`Roosevelt made a js bundle output directory when it shouldn't as generateFolderStructure is false`)
      }
      done()
    })
  })
})
