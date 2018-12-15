/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fs = require('fs')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const klawsync = require('klaw-sync')
const path = require('path')

// test app directory
const appDir = path.join(__dirname, '../app/cssTest')

// sample CSS array to test the compiler with
let cssDataArray = [
  `body {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`,
  `#selector {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`,
  `.body {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`
]

// options to pass into test app generator
let options = { rooseveltPath: '../../../roosevelt', method: 'initServer', stopServer: true }

// array of paths for generated static less test files
let pathOfCSSStaticFilesArray = [
  path.join(appDir, 'statics/css/a.less'),
  path.join(appDir, 'statics/css/b.less'),
  path.join(appDir, 'statics/css/c.less')
]

// array of paths for compiled css files
let pathOfCSSCompiledfilesArray = [
  path.join(appDir, 'statics/.build/css/a.css'),
  path.join(appDir, 'statics/.build/css/b.css'),
  path.join(appDir, 'statics/.build/css/c.css')
]

describe('CSS Section Tests', function () {
  beforeEach(function () {
    // start by generating a static folder in the roosevelt test app directory
    fse.ensureDirSync(path.join(appDir, 'statics/css'))
    // generate sample less files in statics by looping through sample CSS
    for (let x = 0; x < cssDataArray.length; x++) {
      fs.writeFileSync(pathOfCSSStaticFilesArray[x], cssDataArray[x])
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

  it('should compile the static CSS files using roosevelt-less', function (done) {
    // generate the test app
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the message being sent back from the initialized app, test to see that they are there
    testApp.on('message', () => {
      // look for the folder
      let pathToCompiledFolder = path.join(appDir, 'statics/.build/css')
      let cssCompiledArray = klawsync(pathToCompiledFolder)
      // look at each file and see that it checks out with the test array
      cssCompiledArray.forEach((file) => {
        let test = pathOfCSSCompiledfilesArray.includes(file.path)
        assert.strictEqual(test, true)
      })
      // kill the app
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should only compile the files that are in the whitelisted parameter', function (done) {
    // array for whitelisted files
    const pathOfWhiteListedArray = [
      path.join(appDir, 'statics/.build/css/b.css'),
      path.join(appDir, 'statics/.build/css/c.css')
    ]

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['b.less', 'c.less']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the message being sent back from the initialized app, test to see that the whitelist files were compiled
    testApp.on('message', () => {
      // look for the folder
      let pathToCompiledFolder = path.join(appDir, 'statics/.build/css')
      let cssCompiledArray = klawsync(pathToCompiledFolder)
      // look at each file and see that it checks out with the test array
      cssCompiledArray.forEach((file) => {
        let test = pathOfWhiteListedArray.includes(file.path)
        assert.strictEqual(test, true)
      })
      // kill the app
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should rename the folder for compiled output based on the css output parameter', function (done) {
    // path to CSS custom directory compiled files
    let pathOfCSSCustomDirCompiledfilesArray = [
      path.join(appDir, 'statics/.build/cssCompiledTest/a.css'),
      path.join(appDir, 'statics/.build/cssCompiledTest/b.css'),
      path.join(appDir, 'statics/.build/cssCompiledTest/c.css')
    ]

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        output: '.build/cssCompiledTest'
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server is initialized, look to see if the folder exist and if the files are there
    testApp.on('message', () => {
      let pathOfCSSCompiledFolder = path.join(appDir, 'statics/.build/cssCompiledTest')
      let cssCompiledArray = klawsync(pathOfCSSCompiledFolder)
      // go through each file to see if their pathname matches with the changed array above and that there are no extras
      cssCompiledArray.forEach((file) => {
        let test = pathOfCSSCustomDirCompiledfilesArray.includes(file.path)
        assert.strictEqual(test, true)
      })
      // kill the app
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('make a CSS file that declares a CSS variable that contains the app version number from package.js', function (done) {
    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: '_version.less',
          varName: 'appVersion'
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // wait for the app to be finished initialized
    testApp.on('message', () => {
      // see if the file exist inside the css folder
      let versionFilePath = path.join(appDir, 'statics/css/_version.less')
      let test1 = fs.existsSync(versionFilePath)
      assert.strictEqual(test1, true)
      // see that the value in the css version file is correct
      let versionFileString = fs.readFileSync(path.join(appDir, 'statics/css/_version.less'), 'utf8')
      let versionFileNum = versionFileString.split(`'`)
      let test2 = packageJSON.version === versionFileNum[1]
      assert.strictEqual(test2, true)
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should make the compiled whitelist file using the delimiter that is passed into it as its name', function (done) {
    // make an array that holds the custom directory compiled CSS file
    let pathOfCustomDirCompiledCSSArray = [
      path.join(appDir, 'statics/.build/css/test/blah.css')
    ]

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['a.less:test/blah.css']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // wait for a message to test if the file is in the right position
    testApp.on('message', () => {
      let pathOfCompiledDLCSS = path.join(appDir, 'statics/.build/css/test')
      let CompiledDLCSSArray = klawsync(pathOfCompiledDLCSS)
      CompiledDLCSSArray.forEach((file) => {
        let test = pathOfCustomDirCompiledCSSArray.includes(file.path)
        assert.strictEqual(test, true)
      })
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should copy over the CSS files to build without changing them when the minify param is false', function (done) {
    // grab the buffers of the static files
    let bufferOfStaticFileA = fs.readFileSync(pathOfCSSStaticFilesArray[0], 'utf8')
    let bufferOfStaticFileB = fs.readFileSync(pathOfCSSStaticFilesArray[1], 'utf8')
    let bufferOfStaticFileC = fs.readFileSync(pathOfCSSStaticFilesArray[2], 'utf8')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true,
      minify: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen to the message and check that the build files are the same as there static counterpart
    testApp.on('message', () => {
      // grab the buffers of the *compiled* files
      let bufferOfCompiledFileA = fs.readFileSync(pathOfCSSCompiledfilesArray[0], 'utf8')
      let bufferOfCompiledFileB = fs.readFileSync(pathOfCSSCompiledfilesArray[1], 'utf8')
      let bufferOfCompiledFileC = fs.readFileSync(pathOfCSSCompiledfilesArray[2], 'utf8')
      // make the comparisons between the files in the build and the files in the static
      let test1 = bufferOfStaticFileA === bufferOfCompiledFileA
      let test2 = bufferOfStaticFileB === bufferOfCompiledFileB
      let test3 = bufferOfStaticFileC === bufferOfCompiledFileC
      // test these compairsion
      assert.strictEqual(test1, true)
      assert.strictEqual(test2, true)
      assert.strictEqual(test3, true)
      // kill the app and finish test
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should throw an error if a css preprocessor is not provided as a param', function (done) {
    // bool var to hold whether or not Roosevelt throws the error that we did not include a css preprocessor
    let missingCSSPreprocessorBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      css: {
        compiler: {
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error logs, see if the specific error is given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to include your CSS preprocessor')) {
        missingCSSPreprocessorBool = true
      }
    })

    // when the app finishes its initalization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the specific error was given
    testApp.on('exit', () => {
      assert.strictEqual(missingCSSPreprocessorBool, true, 'Roosevelt did not throw an error on the fact that there is no css preprocessor given to the css nodeModule param')
      done()
    })
  })

  it('should throw an error if the css preprocessor passed in is not compatible with Roosevelt (does not have parse function)', function (done) {
    // bool var to hold whether or not a specific error was thrown by Roosevelt
    let incompatibleProcessorErrorBool = false
    fse.outputFileSync(path.join(__dirname, '../../node_modules/test_module_1/index.js'), 'module.exports = function () {}')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'test_module_1',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true,
      minify: false
    }, options)
    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, see if any one of them are the specific error
    testApp.stderr.on('data', (data) => {
      if (data.includes('out of date or incompatible with this version of Roosevelt')) {
        incompatibleProcessorErrorBool = true
      }
    })

    // Roosevelt quits the entire process if it runs into this error, so it should not finish initialization
    testApp.on('message', () => {
      assert.fail('app was able to finish initialization when its CSS preprocessor is imcompatible with it')
      testApp.send('stop')
    })

    // on exit, see if the error was given
    testApp.on('exit', () => {
      fse.removeSync(path.join(__dirname, '../../node_modules/test_module_1'))
      assert.strictEqual(incompatibleProcessorErrorBool, true, 'Roosevelt did not throw an error when its CSS preprocessor is imcompatible with it')
      done()
    })
  })

  it('should throw an error if the css preprocessor passed in is not compatible with Roosevelt (it has the parse method, but it does not have the correct arguments)', function (done) {
    // bool var to hold whether or not a specific error was thrown by Roosevelt
    let incompatibleProcessorErrorBool = false
    fse.outputFileSync(path.join(__dirname, '../../node_modules/test_module_2/index.js'), 'let parse = function (arg1) { }\nmodule.exports.parse = parse')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'test_module_2',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true,
      minify: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on error logs, see if any one of them are the specific error
    testApp.stderr.on('data', (data) => {
      if (data.includes('out of date or incompatible with this version of Roosevelt')) {
        incompatibleProcessorErrorBool = true
      }
    })

    // Roosevelt quits the entire process if it runs into this error, so it should not finish initialization
    testApp.on('message', () => {
      assert.fail('app was able to finish initialization when its CSS preprocessor is imcompatible with it')
      testApp.send('stop')
    })

    // on exit, see if the error was given
    testApp.on('exit', () => {
      fse.removeSync(path.join(__dirname, '../../node_modules/test_module_2'))
      assert.strictEqual(incompatibleProcessorErrorBool, true, 'Roosevelt did not throw an error when its CSS preprocessor is imcompatible with it')
      done()
    })
  })

  it('should make the css directory if one is not present in the app directory', function (done) {
    // bool var to see if the specific Roosevelt log is given
    let madeCSSDirectoryBool = false
    // get rid of the css folder that was generated before the test
    fse.removeSync(path.join(appDir, 'statics/css'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console logs, see if any one of them are the specific log we want
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics/css')}`)) {
        madeCSSDirectoryBool = true
      }
    })

    // when the app finishes initialization, check that the directory is ther
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'statics/css'))
      assert.strictEqual(test, true)
      testApp.send('stop')
    })

    // when the app is about to exit, check whether or not the specific log was given
    testApp.on('exit', () => {
      assert.strictEqual(madeCSSDirectoryBool, true, 'Roosevelt did not make a css Directory when one is not present')
      done()
    })
  })

  it('should not make a css directory if the generateFolderStructure param is false', function (done) {
    // bool var to see if the specific Roosevelt log is given
    let madeCSSDirectoryBool = false
    // get rid of the css folder that was generated before the test
    fse.removeSync(path.join(appDir, 'statics/css'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console logs, see if any one of them are the specific log we want
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'statics/css')}`)) {
        madeCSSDirectoryBool = true
      }
    })

    // when the app finishes initialization, check that the directory is not there
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'statics/css'))
      assert.strictEqual(test, false)
      testApp.send('stop')
    })

    // when the app is about to exit, check whether or not the specific log was given
    testApp.on('exit', () => {
      assert.strictEqual(madeCSSDirectoryBool, false, 'Roosevelt did make a css Directory when generateFolderStructure is false')
      done()
    })
  })

  it('should throw an error if what\'s passed into the whitelist param is not an object', function (done) {
    // bool var to hold whether or not we recieve the specific error message or not
    let whitelistNotCorrectErrorBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: true
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // look into the error logs and see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('CSS whitelist not configured correctly. Please ensure that it is an array')) {
        whitelistNotCorrectErrorBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to finish, check that the error was given
    testApp.on('exit', () => {
      assert.strictEqual(whitelistNotCorrectErrorBool, true, 'Roosevelt did not throw an error when the whitelist param is not an array')
      done()
    })
  })

  it('should not make a compiled css directory if one is present', function (done) {
    // bool var to hold whether or not a specific log was given
    let cssCompiledDirMadeBool = false

    // create the compiled css folder before the creation of the app.js file
    let dir1Path = path.join(appDir, 'statics/.build')
    let dir2Path = path.join(dir1Path, 'css')
    fse.mkdirSync(dir1Path)
    fse.mkdirSync(dir2Path)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output logs to see if the specific log was given
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${dir2Path}`)) {
        cssCompiledDirMadeBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check that the specific log was given
    testApp.on('exit', () => {
      assert.strictEqual(cssCompiledDirMadeBool, false, 'Roosevelt made a css compiled directory even though one is alreadly present')
      done()
    })
  })

  it('should not make a css compiled directory if generateFolderStructure is false', function (done) {
    // bool var to hold whether or not a specific log was given
    let cssCompiledDirMadeBool = false

    // path to the build folder
    const cssBuildDirPath = path.join(appDir, 'statics/.build/css')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output logs to see if the specific log was given
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${cssBuildDirPath}`)) {
        cssCompiledDirMadeBool = true
      }
    })

    // when the app finishes initialization, check that the folder was not made
    testApp.on('message', () => {
      let test = fse.existsSync(cssBuildDirPath)
      assert.strictEqual(test, false)
      testApp.send('stop')
    })

    // when the app is about to exit, check that the specific log was given
    testApp.on('exit', () => {
      assert.strictEqual(cssCompiledDirMadeBool, false, 'Roosevelt made a css compiled directory even though GenerateTestApp is false')
      done()
    })
  })

  it('should throw an error if versionFile is true but filename is missing', function (done) {
    // bool var to hold whether or not the specific error was thrown
    let filenameMissingErrorBool = false

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          varName: 'appVersion'
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to write versioned CSS file! fileName missing or invalid')) {
        filenameMissingErrorBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, check to see if the specific error was logged out
    testApp.on('exit', () => {
      assert.strictEqual(filenameMissingErrorBool, true, 'Roosevelt did not throw an error when the user is trying to make a versionFile with the file name param being undefined')
      done()
    })
  })

  it('should throw an error if versionFile is true but filename is not a string', function (done) {
    // bool var to hold whether or not the specific error was thrown
    let filenameInvalidErrorBool = false

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: 6,
          varName: 'appVersion'
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to write versioned CSS file! fileName missing or invalid')) {
        filenameInvalidErrorBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, check to see if the specific error was logged out
    testApp.on('exit', () => {
      assert.strictEqual(filenameInvalidErrorBool, true, 'Roosevelt did not throw an error when the user is trying to make a versionFile with the file name param not being a string')
      done()
    })
  })

  it('should throw an error if versionFile is true but varName is missing', function (done) {
    // bool var to hold whether or not the specific error was thrown
    let varnameMissingErrorBool = false

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: 'something'
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to write versioned CSS file! varName missing or invalid')) {
        varnameMissingErrorBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, check to see if the specific error was logged out
    testApp.on('exit', () => {
      assert.strictEqual(varnameMissingErrorBool, true, 'Roosevelt did not throw an error when the user is trying to make a versionFile with the var name param being undefined')
      done()
    })
  })

  it('should throw an error if versionFile is true but varname is not a string', function (done) {
    // bool var to hold whether or not the specific error was thrown
    let varnameInvalidErrorBool = false

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: 'something',
          varName: 6
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the specific error was given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to write versioned CSS file! varName missing or invalid')) {
        varnameInvalidErrorBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, check to see if the specific error was logged out
    testApp.on('exit', () => {
      assert.strictEqual(varnameInvalidErrorBool, true, 'Roosevelt did not throw an error when the user is trying to make a versionFile with the var name param not being a string')
      done()
    })
  })

  it('should not create a versionFile file if one alreadly exists with the exact same data', function (done) {
    // bool var to hold whether or not Roosevelt had console logged a specfic message
    let versionFileCreationLogBool = false
    // versionFile source String
    let versionFileSourceString = `/* do not edit; generated automatically by Roosevelt */ @appVersion: '0.3.1';\n`
    // write the file in the css directory
    let versionFilePath = path.join(appDir, 'statics/css/_version.less')
    fse.writeFileSync(versionFilePath, versionFileSourceString)

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: '_version.less',
          varName: 'appVersion'
        }
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console logs, check to see if the creation versionFile log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes('writing new versioned CSS file to reflect new version')) {
        versionFileCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is going to exit, see if the creation versionFile log was made
    testApp.on('exit', () => {
      assert.strictEqual(versionFileCreationLogBool, false, 'Roosevelt created a new versionFile file even thought their is one that exist and is up to date')
      done()
    })
  })

  it('should not create a versionFile file if generateTestApp is false', function (done) {
    // bool var to hold whether or not a specific log was made
    let versionFileCreationLogBool = false

    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // write the file in the css directory
    let versionFileSourceString = ''
    let versionFilePath = path.join(appDir, 'statics/css/_version.less')
    fse.writeFileSync(versionFilePath, versionFileSourceString)

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: '_version.less',
          varName: 'appVersion'
        }
      },
      generateFolderStructure: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on console logs, check to see if the creation versionFile log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes('writing new versioned CSS file to reflect new version')) {
        versionFileCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is going to exit, see if the creation versionFile log was made
    testApp.on('exit', () => {
      assert.strictEqual(versionFileCreationLogBool, false, 'Roosevelt created a new versionFile file even thought their is one that exist and is up to date')
      done()
    })
  })

  it('should throw an error if a file specified in the CSS whitelist does not exist', function (done) {
    // bool var to hold whether or not the specific error was given
    let whitelistNotSpecificedError = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['b.less', 'c.less', 'd.less']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the specifc whitelist error was thrown
    testApp.stderr.on('data', (data) => {
      if (data.includes('specified in CSS whitelist does not exist. Please ensure file is entered properly')) {
        whitelistNotSpecificedError = true
      }
    })

    // when the app is finished initialization, check to see if the file is there
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'statics/.build/css/d.less'))
      assert.strictEqual(test, false)
      testApp.send('stop')
    })

    // when the app is about to exit, see if the error was thrown
    testApp.on('exit', () => {
      assert.strictEqual(whitelistNotSpecificedError, true, 'Roosevelt did not throw an error when a non-existent file is placed in the whitelist array param')
      done()
    })
  })

  it('should not make the compiled file if the path of the file in the whitelist array leads to a directory', function (done) {
    // bool var to hold whether or not a specific log was given
    let cssFileMadeLogBool = false

    // create the directory in the statics css dir
    let dirPath = path.join(appDir, 'statics/css/dir')
    fse.mkdirSync(dirPath)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['dir']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output logs to see if Roosevelt made a compiled file out of the directory
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new CSS file ${path.join(appDir, 'statics/.build/css/dir')}`)) {
        cssFileMadeLogBool = true
      }
    })

    // when the app finishes initialization, check to see that a file of the directory was not made
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'statics/.build/css/dir'))
      assert.strictEqual(test, false)
      testApp.send('stop')
    })

    // when the app is about to exit, see if the log was given
    testApp.on('exit', () => {
      assert.strictEqual(cssFileMadeLogBool, false, 'Roosevelt made a compiled file for a directory')
      done()
    })
  })

  it('should not make the compiled file if the path of the file in the whitelist array is Thumbs.db', function (done) {
    // bool var to hold whether or not a specific log was given
    let cssFileMadeLogBool = false

    // create three files
    let sourceCode = ''
    let pathForThumbs = path.join(appDir, 'statics/css/Thumbs.db')
    fse.writeFileSync(pathForThumbs, sourceCode)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['Thumbs.db']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output logs to see if Roosevelt made a compiled file out of the directory
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new CSS file ${path.join(appDir, 'statics/.build/css/Thumbs.db')}`)) {
        cssFileMadeLogBool = true
      }
    })

    // when the app finishes initialization, check to see that a file of the directory was not made
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'statics/.build/css/Thumbs.db'))
      assert.strictEqual(test, false)
      testApp.send('stop')
    })

    // when the app is about to exit, see if the log was given
    testApp.on('exit', () => {
      assert.strictEqual(cssFileMadeLogBool, false, 'Roosevelt made a compiled file for a directory')
      done()
    })
  })

  it('should not create a new compiled file if one exist and the user set generateFolderStructure to false', function (done) {
    // bool var to hold whether a specific log has be given
    let cssCompiledCreationBool = false

    // make the file first
    let sourceCode = ''
    let buildDirPath = path.join(appDir, 'statics/.build')
    fse.mkdirSync(buildDirPath)
    let buildDirPath2 = path.join(appDir, 'statics/.build/css')
    fse.mkdirSync(buildDirPath2)
    let fileCompiledPath = path.join(buildDirPath2, 'a.css')
    fse.writeFileSync(fileCompiledPath, sourceCode)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['a.less']
      },
      generateFolderStructure: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output logs to see if the file compiled log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`writing new CSS file ${fileCompiledPath}`)) {
        cssCompiledCreationBool = true
      }
    })

    // when the app finishes initailization. kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, see if the file compiled log was made
    testApp.on('exit', () => {
      assert.strictEqual(cssCompiledCreationBool, false, 'Roosevelt compiled the file in the whitelist array even though generateFolderStructure is false')
      done()
    })
  })

  it('should start roosevelt app in production mode with a custom css preprocessor', function (done) {
    // bool var to hold whether or not a custom preprocessor was found
    let foundPreprocessor = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      cssCompiler: `(app) => { return { versionCode: (app) => { return 1 }, parse: (app, fileName) => { return 1 } } }`,
      css: {
        sourcePath: 'css',
        compiler: {
          nodeModule: 'custom-csspreprocessor',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      }
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), ['--prod'], { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes('is using your custom css preprocessor')) {
        foundPreprocessor = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(foundPreprocessor, true, 'The Roosevelt app did not use the custom css preprocessor')
      done()
    })
  })
})
