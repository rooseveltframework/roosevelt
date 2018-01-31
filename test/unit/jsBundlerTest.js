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
    }, '../../../roosevelt', 'initServer')

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
      testApp.kill()
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
    }, '../../../roosevelt', 'initServer')

    // create a fork of the app.js file and run it as a child process in development mode
    const testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test that the folder for bundled js exist, is in the right place, and has a outputfile of bundle.js
    testApp.on('message', () => {
      let arrayOfFiles = klawsync(pathOfBundleJSFolder)
      arrayOfFiles.forEach((file) => {
        let test = arrayOfBundleJSFilesPaths.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill()
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
    }, '../../../roosevelt', 'initServer')

    // create a fork of the app.js file and run it as a child process in production
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // test the path of the bundle JS folder and check if there are any files there. (should be zero)
    testApp.on('message', () => {
      let arrayOfFiles = klawsync(pathOfBundleJSFolder)
      let test = arrayOfFiles.length
      assert.equal(test, 0)
      testApp.kill()
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
    }, '../../../roosevelt', 'initServer')

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
      testApp.kill()
      done()
    })
  })
})
